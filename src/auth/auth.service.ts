import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { SignupDto } from './dtos/signup.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dtos/login.dto';
import { JwtService } from '@nestjs/jwt';
import { RefreshToken } from './entities/refresh-token.entity';
import { v4 as uuidv4 } from "uuid";
import { RefreshTokenDto } from './dtos/refresh.dto';
import { ChangePasswordDto } from './dtos/changePassword.dto';
import { nanoid } from 'nanoid';
import { ResetToken } from './entities/reset-token.entity';
import { EmailVerification } from './entities/email-verification.entity';
import { MailService } from 'src/services/mail.service';


@Injectable()
export class AuthService {

    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
        @InjectRepository(RefreshToken)
        private tokenRepository: Repository<RefreshToken>,
        @InjectRepository(ResetToken)
        private tokenResetRepository: Repository<ResetToken>,
        @InjectRepository(EmailVerification)
        private emailVerificationRepository: Repository<EmailVerification>,
        private jwtService: JwtService,
        private mailService: MailService,
        
    ) { }

    async signup(signupData: SignupDto) {

        const { first_name, last_name, username, email, password, age, preferred_language_id } = signupData;

        //Check If Email Is in Use
        const isEmailInUse = await this.usersRepository.findOneBy({ email: email })

        const isUserNameInUse = await this.usersRepository.findOneBy({ username: username })
        if (isEmailInUse) {
            throw new BadRequestException('Email Already In Use');
        }

        if (isUserNameInUse) {
            throw new BadRequestException('UserName Already In Use');
        }

        //Hash Password
        const salt = await bcrypt.genSalt(10); // for generate different hash for the same password
        const hashpassword = await bcrypt.hash(password, salt);


        //Create and Save The User in The DataBase
        const newUser = this.usersRepository.create({
            first_name,
            last_name,
            username,
            email,
            password: hashpassword,
            age,
            preferred_language_id
        });

        await this.usersRepository.save(newUser);

        // Generate email verification token
        const verificationToken = nanoid(64);
        const expiryDate = new Date();
        expiryDate.setHours(expiryDate.getHours() + 24); // expires in 24 hours
        const salt2 = await bcrypt.genSalt(10);
        const hashedVerificationToken = await bcrypt.hash(verificationToken, salt2);
        const verificationEntry = this.emailVerificationRepository.create({
            token_hash: hashedVerificationToken,
            user_id: newUser.id,
            expires_at: expiryDate,
        });
        await this.emailVerificationRepository.save(verificationEntry);

        // Send the verification email
        await this.mailService.sendVerificationEmail(newUser.email, verificationToken);

        return { message: 'Registration successful! Please check your email to verify your account.' };
    }

    async login(logindata: LoginDto) {
        const { email, username, password } = logindata;

        // find The User With Email OR Password
        // because the password has select: false in the entitie User , The Password is ignores by the findOneBy()
        // So We Use QueryBuilder for retrieves the password during the login query while keeping it hidden by default in the rest of the app
        const user = await this.usersRepository.createQueryBuilder('user')
            .addSelect('user.password')
            .where('user.email = :email OR user.username = :username', { email, username })
            .getOne();
        if (!user) {
            throw new UnauthorizedException('User Not Found')
        }

        //Compare The password With The Existing Password Hashing
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            throw new UnauthorizedException('Password Not Correcte');
        }

        //Generate A JWT Tokens
        const tokens = await this.generateUserTokens(user.id);
        return {
            ...tokens,
            userId: user.id,
        };


    }

    async generateUserTokens(userId) {
        const accessToken = this.jwtService.sign({ userId }, { expiresIn: '1h' });
        const refreshToken = uuidv4();
        this.storeRefreshToken(refreshToken, userId);
        return {
            accessToken,
            refreshToken,
        };

    }

    async storeRefreshToken(token: string, userId) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 3);
        const salt = await bcrypt.genSalt(10);
        const hashToken = await bcrypt.hash(token, salt);
        const newToken = this.tokenRepository.create({
            token_hash: hashToken,
            user_id: userId,
            expires_at: expiryDate
        });

        await this.tokenRepository.save(newToken);

    }

    async refreshTokens(token: string) {
        // Find all non-expired tokens from the database
        const storedTokens = await this.tokenRepository.find({
            where: {
                expires_at: MoreThanOrEqual(new Date()),
            },
        });

        // Because the token is hashed in the DB, we need to compare each one
        let matchedToken: RefreshToken | null = null;
        for (const storedToken of storedTokens) {
            const isMatch = await bcrypt.compare(token, storedToken.token_hash);
            if (isMatch) {
                matchedToken = storedToken;
                break;
            }
        }

        if (!matchedToken) {
            throw new UnauthorizedException('Refresh Token Is Invalid or Expired');
        }

        // Delete the used refresh token from the database
        await this.tokenRepository.delete({ user_id: matchedToken.user_id });

        // Generate new tokens (this will automatically store the new refresh token)
        return this.generateUserTokens(matchedToken.user_id);
    }

    async changePassword(userId, oldPassword: string, newPassword: string) {
        // Find The User and explicitly select the password
        const user = await this.usersRepository.createQueryBuilder('user')
            .addSelect('user.password')
            .where('user.id = :id', { id: userId })
            .getOne();

        if (!user) {
            throw new BadRequestException('User Not Found...');
        }

        // Compare The Old Password with Password In The DB
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            throw new UnauthorizedException('Incorrect Password!!!');
        }

        // Change The Password , And Don't Forget TO Hash IT!!!
        const salt = await bcrypt.genSalt(10); // for generate different hash for the same password
        const newHashpassword = await bcrypt.hash(newPassword, salt);
        user.password = newHashpassword;
        await this.usersRepository.save(user);

        return { message: 'Password changed successfully' };
    }

    async forgotPassword(email: string) {
        //Check that the User Exists
        const user = await this.usersRepository.findOneBy({ email: email });

        if (user) {
            //if The User Exists, generate reset link
            const resetToken = nanoid(64);
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + 3);
            const salt = await bcrypt.genSalt(10);
            const hashToken = await bcrypt.hash(resetToken, salt);
            const newToken = await this.tokenResetRepository.create({
                token_hash: hashToken,
                user_id: user.id,
                expires_at: expiryDate
            });
             await this.tokenResetRepository.save(newToken);
            //Send he link to the User by email (using nodemailer / SES / etc...)
            this.mailService.sendPasswordResetEmail(email, resetToken);
        }

        return { message: 'If this user exists, they will recieve an Email...' };
    }

    async resetPassword(newPassword: string, resetToken: string) {
        // Find all non-expired reset tokens from the database
        const storedTokens = await this.tokenResetRepository.find({
            where: {
                expires_at: MoreThanOrEqual(new Date()),
            },
        });

        // Because the token is hashed in the DB, we must bcrypt.compare each one
        let matchedToken: ResetToken | null = null;
        for (const storedToken of storedTokens) {
            const isMatch = await bcrypt.compare(resetToken, storedToken.token_hash);
            if (isMatch) {
                matchedToken = storedToken;
                break;
            }
        }

        if (!matchedToken) {
            throw new UnauthorizedException('Reset Token Is Invalid or Expired');
        }

        // Delete the used reset token so it can't be reused
        await this.tokenResetRepository.delete({ user_id: matchedToken.user_id });

        // Find the user and update their password (hashed!)
        const user = await this.usersRepository.createQueryBuilder('user')
            .addSelect('user.password')
            .where('user.id = :id', { id: matchedToken.user_id })
            .getOne();

        if (!user) {
            throw new BadRequestException('User Not Found');
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await this.usersRepository.save(user);

        return { message: 'Password reset successfully' };
    }

    async verifyEmail(token: string) {
        // Find all non-expired verification tokens
        const storedTokens = await this.emailVerificationRepository.find({
            where: {
                expires_at: MoreThanOrEqual(new Date()),
            },
        });

        // bcrypt.compare each one to find the matching token
        let matchedToken: EmailVerification | null = null;
        for (const storedToken of storedTokens) {
            const isMatch = await bcrypt.compare(token, storedToken.token_hash);
            if (isMatch) {
                matchedToken = storedToken;
                break;
            }
        }

        if (!matchedToken) {
            throw new BadRequestException('Verification link is invalid or has expired');
        }

        // Delete the used token so it can't be reused
        await this.emailVerificationRepository.delete({ user_id: matchedToken.user_id });

        // Mark the user as verified
        await this.usersRepository.update(matchedToken.user_id, { email_verified: true });

        return { message: 'Email verified successfully! You can now log in.' };
    }

    async findUserByEmail(email: string) {
        return await this.usersRepository.findOneBy({ email: email });
    }

    async createUser(userData: { email: string, username: string, firstName?: string, lastName?: string, picture?: string, googleId?: string }) {
        let username = userData.username;
        
        // Ensure username is unique, as it has a unique constraint in the User entity
        let isUserNameInUse = await this.usersRepository.findOneBy({ username: username });
        if (isUserNameInUse) {
            username = `${username}_${Math.floor(1000 + Math.random() * 9000)}`;
        }

        const newUser = this.usersRepository.create({
            email: userData.email,
            username: username,
            first_name: userData.firstName || 'Google',
            last_name: userData.lastName || 'User',
            email_verified: true, // Google emails are already verified
        });

        return await this.usersRepository.save(newUser);
    }
}
