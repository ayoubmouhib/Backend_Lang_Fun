import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { AddUserLanguageDto } from './dto/add-user-language.dto';
import { User } from './entities/user.entity';
import { UserLanguageProgress, InitialLevel } from './entities/user-language-progress.entity';
import { Language } from '../languages/entities/language.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { join } from 'path';
import { unlink } from 'fs/promises';
import { FollowsService } from '../follows/follows.service';

const PROFILE_PICTURE_DIR = join(process.cwd(), 'uploads', 'profile-pictures');

@Injectable()
export class UserService {

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(UserLanguageProgress)
    private progressRepository: Repository<UserLanguageProgress>,
    @InjectRepository(Language)
    private languagesRepository: Repository<Language>,
    private followsService: FollowsService,
  ) {}

  async findOne(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: [
        'interests',
        'language',
        'userLanguages',
        'userLanguages.language',
        'languageProgress',
        'languageProgress.language',
      ],
    });

    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }

    return user;
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({
      relations: ['language'],
    });
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    Object.assign(user, updateUserDto);
    return this.usersRepository.save(user);
  }

  async updateProfilePicture(id: number, filename: string): Promise<User> {
    const user = await this.findOne(id);
    const previousFilename = user.profile_picture;

    user.profile_picture = filename;
    const saved = await this.usersRepository.save(user);

    if (previousFilename && previousFilename !== filename) {
      await unlink(join(PROFILE_PICTURE_DIR, previousFilename)).catch(() => undefined);
    }

    return saved;
  }

  async addLanguage(userId: number, dto: AddUserLanguageDto): Promise<User> {
    const language = await this.languagesRepository.findOne({
      where: { id: dto.language_id },
    });
    if (!language) {
      throw new NotFoundException(`Language #${dto.language_id} not found`);
    }

    const existing = await this.progressRepository.findOne({
      where: { user_id: userId, language_id: dto.language_id },
    });
    if (existing) {
      throw new ConflictException('You are already learning this language');
    }

    const progress = this.progressRepository.create({
      user_id: userId,
      language_id: dto.language_id,
      initial_level: dto.level ?? InitialLevel.BEGINNER,
      user_type: 'learning',
    });
    await this.progressRepository.save(progress);

    return this.findOne(userId);
  }

  async remove(id: number): Promise<{ message: string }> {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
    return { message: `User #${id} deleted successfully` };
  }

  async getLeaderboard(period: string, category: string, currentUserId: number) {
    const qb = this.progressRepository
      .createQueryBuilder('p')
      .select('p.user_id', 'userId')
      .addSelect('u.first_name', 'firstName')
      .addSelect('u.last_name', 'lastName')
      .addSelect('u.username', 'username')
      .addSelect('SUM(p.xp_points)', 'totalXp')
      .addSelect('MAX(p.current_streak_days)', 'maxStreak')
      .addSelect('SUM(p.conversation_count)', 'totalConversations')
      .innerJoin('p.user', 'u')
      .where('u.is_active = :active', { active: true })
      .groupBy('p.user_id')
      .addGroupBy('u.first_name')
      .addGroupBy('u.last_name')
      .addGroupBy('u.username');

    if (period === 'week') {
      qb.andWhere('p.last_activity_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)');
    } else if (period === 'month') {
      qb.andWhere('p.last_activity_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)');
    }

    if (category === 'streak') {
      qb.orderBy('MAX(p.current_streak_days)', 'DESC');
    } else if (category === 'conversations') {
      qb.orderBy('SUM(p.conversation_count)', 'DESC');
    } else {
      qb.orderBy('SUM(p.xp_points)', 'DESC');
    }

    const raw = await qb.limit(50).getRawMany();

    const entries = raw.map((row, i) => {
      const fn = (row.firstName ?? '').trim();
      const ln = (row.lastName ?? '').trim();
      const name = fn || ln ? `${fn} ${ln}`.trim() : row.username;
      const initials = fn && ln
        ? `${fn[0]}${ln[0]}`.toUpperCase()
        : name.substring(0, 2).toUpperCase();
      return {
        rank: i + 1,
        userId: Number(row.userId),
        name,
        initials,
        totalXp: Number(row.totalXp) || 0,
        maxStreak: Number(row.maxStreak) || 0,
        totalConversations: Number(row.totalConversations) || 0,
        isCurrentUser: Number(row.userId) === currentUserId,
      };
    });

    const currentUserRank = entries.findIndex(e => e.userId === currentUserId) + 1;
    return { entries, currentUserRank: currentUserRank || null };
  }

  async searchUsers(query: string, currentUserId: number) {
    const term = query.trim();
    if (!term) return [];

    const users = await this.usersRepository.find({
      where: [
        { username: Like(`%${term}%`) },
        { first_name: Like(`%${term}%`) },
        { last_name: Like(`%${term}%`) },
      ],
      relations: ['language'],
      take: 20,
    });

    return Promise.all(
      users
        .filter((u) => u.id !== currentUserId)
        .map(async (u) => {
          const relationship = await this.followsService.getRelationshipStatus(currentUserId, u.id);
          return {
            id: u.id,
            name: `${u.first_name} ${u.last_name}`.trim(),
            username: u.username,
            profile_picture: u.profile_picture,
            native_language: u.language
              ? { id: u.language.id, name: u.language.name, iso_code: u.language.iso_code }
              : null,
            relationship_status: relationship.status,
          };
        }),
    );
  }

  async getPublicProfile(targetUserId: number, viewerId: number) {
    const user = await this.usersRepository.findOne({
      where: { id: targetUserId },
      relations: ['interests', 'language', 'languageProgress', 'languageProgress.language'],
    });
    if (!user) {
      throw new NotFoundException(`User #${targetUserId} not found`);
    }

    const [counts, relationship, scoreAndRank] = await Promise.all([
      this.followsService.getFollowCounts(targetUserId),
      this.followsService.getRelationshipStatus(viewerId, targetUserId),
      this.getScoreAndRank(targetUserId),
    ]);

    return {
      id: user.id,
      name: `${user.first_name} ${user.last_name}`.trim(),
      username: user.username,
      profile_picture: user.profile_picture,
      age: user.age,
      native_language: user.language
        ? { id: user.language.id, name: user.language.name, iso_code: user.language.iso_code }
        : null,
      interests: (user.interests ?? []).map((i) => ({ id: i.id, name: i.name, icon: i.icon })),
      learning_languages: (user.languageProgress ?? [])
        .filter((p) => p.user_type === 'learning')
        .map((p) => ({
          language_id: p.language_id,
          language: p.language
            ? { id: p.language.id, name: p.language.name, iso_code: p.language.iso_code }
            : null,
          level: p.initial_level,
          cefr_level: p.cefr_level,
          xp_points: p.xp_points,
        })),
      followers_count: counts.followers,
      following_count: counts.following,
      score: scoreAndRank.score,
      rank: scoreAndRank.rank,
      relationship: relationship.status,
      follow_request_id: relationship.requestId,
    };
  }

  private async getScoreAndRank(userId: number): Promise<{ score: number; rank: number | null }> {
    const totals = await this.progressRepository
      .createQueryBuilder('p')
      .select('p.user_id', 'userId')
      .addSelect('SUM(p.xp_points)', 'totalXp')
      .innerJoin('p.user', 'u')
      .where('u.is_active = :active', { active: true })
      .groupBy('p.user_id')
      .orderBy('SUM(p.xp_points)', 'DESC')
      .getRawMany();

    const index = totals.findIndex((row) => Number(row.userId) === userId);
    return {
      score: index >= 0 ? Number(totals[index].totalXp) || 0 : 0,
      rank: index >= 0 ? index + 1 : null,
    };
  }
}
