import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { SignupDto } from './dtos/signup.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, MoreThanOrEqual, Repository } from 'typeorm';
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
import { MoreThan } from 'typeorm';
import { RandomNumber } from './entities/random-number-verification.entity';
import { Interest } from './entities/interest.entity';
import { Language } from 'src/languages/entities/language.entity';
import { InitialLevel, UserLanguageProgress } from 'src/user/entities/user-language-progress.entity';


@Injectable()
export class AuthService {

    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
        @InjectRepository(Interest)
        private interestsRepository: Repository<Interest>,
        @InjectRepository(RefreshToken)
        private tokenRepository: Repository<RefreshToken>,
        @InjectRepository(ResetToken)
        private tokenResetRepository: Repository<ResetToken>,
        @InjectRepository(EmailVerification)
        private emailVerificationRepository: Repository<EmailVerification>,
        @InjectRepository(RandomNumber)
        private randomNumberRepository: Repository<RandomNumber>,
        @InjectRepository(Language)
        private languagesRepository: Repository<Language>,
        @InjectRepository(UserLanguageProgress)
        private progressRepository: Repository<UserLanguageProgress>,
        private jwtService: JwtService,
        private mailService: MailService,
        private dataSource: DataSource,

    ) { }
    /*
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
            */

        async signup(signupData: SignupDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
        const { first_name, last_name, username, email, password, age, preferred_language_id, interest_ids, languages } = signupData;

        // Check If Email Is in Use — use queryRunner.manager
        const isEmailInUse = await queryRunner.manager.findOne(User, { where: { email } });
        const isUserNameInUse = await queryRunner.manager.findOne(User, { where: { username } });

        if (isEmailInUse) throw new BadRequestException('Email Already In Use');
        if (isUserNameInUse) throw new BadRequestException('UserName Already In Use');

        // Hash Password
        const salt = await bcrypt.genSalt(10);
        const hashpassword = await bcrypt.hash(password, salt);

        // Fetch interests using queryRunner.manager
        let userInterests: Interest[] = [];
        if (interest_ids && interest_ids.length > 0) {
            userInterests = await queryRunner.manager.findBy(Interest, {
                id: In(interest_ids)
            });
            if (userInterests.length !== interest_ids.length) {
                throw new BadRequestException('One or more interest IDs are invalid');
            }
        }

        // Validate languages using queryRunner.manager
        if (languages && languages.length > 0) {
            const languageIds = languages.map(l => l.language_id);
            const validLanguages = await queryRunner.manager.findBy(Language, {
                id: In(languageIds)
            });
            if (validLanguages.length !== languageIds.length) {
                throw new BadRequestException('One or more language IDs are invalid');
            }
            const uniqueIds = new Set(languageIds);
            if (uniqueIds.size !== languageIds.length) {
                throw new BadRequestException('Cannot select the same language twice');
            }
        }

        // 🔥 FIX: Create user using queryRunner.manager, NOT this.usersRepository
        const newUser = queryRunner.manager.create(User, {
            first_name,
            last_name,
            username,
            email,
            password: hashpassword,
            age,
            preferred_language_id,
            interests: userInterests,
        });

        const savedUser = await queryRunner.manager.save(newUser);

        // 🔥 FIX: Create progress entries using queryRunner.manager
        if (languages && languages.length > 0) {
            const progressEntries = languages.map(lang => {
                const levelMap: Record<string, InitialLevel> = {
                    'beginner': InitialLevel.BEGINNER,
                    'intermediate': InitialLevel.INTERMEDIATE,
                    'advanced': InitialLevel.ADVANCED,
                };

                return queryRunner.manager.create(UserLanguageProgress, {
                    user_id: savedUser.id,
                    language_id: lang.language_id,
                    initial_level: levelMap[lang.level],
                    initial_selected_at: new Date(),
                });
            });

            await queryRunner.manager.save(progressEntries); // 🔥 Use manager, not repository
        }

        // Generate email verification token
        const verificationToken = nanoid(64);
        const expiryDate = new Date();
        expiryDate.setHours(expiryDate.getHours() + 24);
        const salt2 = await bcrypt.genSalt(10);
        const hashedVerificationToken = await bcrypt.hash(verificationToken, salt2);

        const verificationEntry = queryRunner.manager.create(EmailVerification, {
            token_hash: hashedVerificationToken,
            user_id: savedUser.id,
            expires_at: expiryDate,
        });
        await queryRunner.manager.save(verificationEntry);

        // Send email (outside transaction is OK)
        await this.mailService.sendVerificationEmail(newUser.email, verificationToken);

        await queryRunner.commitTransaction();

        return { message: 'Registration successful! Please check your email to verify your account.' };

    } catch (error) {
        await queryRunner.rollbackTransaction();
        console.error('Signup error:', error);
        throw error;
    } finally {
        await queryRunner.release();
    }
}   /*
    async signup(signupData: SignupDto) {
        try {
            const { first_name, last_name, username, email, password, age, preferred_language_id, interest_ids, languages  } = signupData;

            // Check If Email Is in Use
            const isEmailInUse = await this.usersRepository.findOneBy({ email: email })
            const isUserNameInUse = await this.usersRepository.findOneBy({ username: username })

            if (isEmailInUse) {
                throw new BadRequestException('Email Already In Use');
            }
            if (isUserNameInUse) {
                throw new BadRequestException('UserName Already In Use');
            }

            // Hash Password
            const salt = await bcrypt.genSalt(10);
            const hashpassword = await bcrypt.hash(password, salt);

            // NEW: Fetch interests if provided
            let userInterests: Interest[] = [];
            if (interest_ids && interest_ids.length > 0) {
            userInterests = await this.interestsRepository.findBy({
                id: In(interest_ids)
            });

            // Validate that all interest IDs exist
            if (userInterests.length !== interest_ids.length) {
                throw new BadRequestException('One or more interest IDs are invalid');
            }
            }

             // Validate languages if provided
    if (languages && languages.length > 0) {
      const languageIds = languages.map(l => l.language_id);
      const validLanguages = await this.languagesRepository.findBy({
        id: In(languageIds)
      });

      if (validLanguages.length !== languageIds.length) {
        throw new BadRequestException('One or more language IDs are invalid');
      }

      // Check for duplicate language IDs
      const uniqueIds = new Set(languageIds);
      if (uniqueIds.size !== languageIds.length) {
        throw new BadRequestException('Cannot select the same language twice');
      }
    }

            // Create and Save The User
            const newUser = this.usersRepository.create({
                first_name,
                last_name,
                username,
                email,
                password: hashpassword,
                age,
                preferred_language_id,
                interests: userInterests,
            });

            await this.usersRepository.save(newUser);
            // Create UserLanguages entries
             if (languages && languages.length > 0) {
      const userLanguageEntries = languages.map(lang => 
        this.userLanguagesRepository.create({
          user_id: newUser.id,
          language_id: lang.language_id,
          proficiency_level: lang.level
        })
      );

      await this.userLanguagesRepository.save(userLanguageEntries);
    }

            // Generate email verification token
            const verificationToken = nanoid(64);
            const expiryDate = new Date();
            expiryDate.setHours(expiryDate.getHours() + 24);
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

        } catch (error) {
            console.error('Signup error:', error);
            throw error;
        }
    }

*/

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
            const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
            const generatedCode = await this.randomNumberRepository.create({
                code_randaom: otpCode,
                user_id: user.id,
                expires_at: new Date(Date.now() + 5 * 60 * 1000)
            });
            await this.randomNumberRepository.save(generatedCode);
            //Send he link to the User by email (using nodemailer / SES / etc...)
            this.mailService.sendPasswordResetEmail(email, otpCode);
        }

        return { message: 'If this user exists, they will recieve an Email...' };
    }
    /*
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
    */
    /*
        async resetPassword(newPassword: string, resetToken: string, codenumber: string) {
            // Find all non-expired reset tokens from the database
            const storedTokens = await this.tokenResetRepository.find({
                where: {
                    expires_at: MoreThanOrEqual(new Date()),
                },
            });
    
            const storedCode = await this.randomNumberRepository.find({
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
    
            // i want to compare the code in the database with the code that the user enter
    
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
            */

    async resetPassword(newPassword: string, codenumber: string) {
        // Find the matching non-expired code
        const matchedCode = await this.randomNumberRepository.findOne({
            where: {
                code_randaom: codenumber,
                expires_at: MoreThanOrEqual(new Date()),
            },
        });

        if (!matchedCode) {
            throw new UnauthorizedException('Verification Code Is Invalid or Expired');
        }

        // Find the user
        const user = await this.usersRepository.createQueryBuilder('user')
            .addSelect('user.password')
            .where('user.id = :id', { id: matchedCode.user_id })
            .getOne();

        if (!user) {
            throw new BadRequestException('User Not Found');
        }

        // Update password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await this.usersRepository.save(user);

        // Cleanup — delete code and token so neither can be reused
        await this.randomNumberRepository.delete({ user_id: matchedCode.user_id });
        await this.tokenResetRepository.delete({ user_id: matchedCode.user_id });

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

    async checkVerificationStatus(email: string) {
        const user = await this.usersRepository.findOneBy({ email });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return {
            email: user.email,
            email_verified: user.email_verified,
        };
    }

    async resendVerificationEmail(email: string) {
        const user = await this.usersRepository.findOneBy({ email });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        if (user.email_verified === true) {
            throw new BadRequestException('Email already verified');
        }

        // Delete old verification tokens for this user
        await this.emailVerificationRepository.delete({ user_id: user.id });

        // Generate new token
        const verificationToken = nanoid(64);
        const expiryDate = new Date();
        expiryDate.setHours(expiryDate.getHours() + 24);
        const hashedToken = await bcrypt.hash(verificationToken, 10);

        const verificationEntry = this.emailVerificationRepository.create({
            token_hash: hashedToken,
            user_id: user.id,
            expires_at: expiryDate,
        });

        await this.emailVerificationRepository.save(verificationEntry);

        // Send email
        await this.mailService.sendVerificationEmail(user.email, verificationToken);

        return { message: 'Verification email sent successfully!' };
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
