import { z } from "zod";

/**
 * Discriminated Union untuk kolom JSONB `question_payload` pada tabel `quizzes`.
 */
export const MultipleChoiceOptionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
});

export const MultipleChoicePayloadSchema = z.object({
  type: z.literal("multiple_choice"),
  prompt: z.string().min(1),
  options: z.array(MultipleChoiceOptionSchema).length(4),
  correct_option_id: z.string().min(1),
  explanation: z.string().min(1),
});

export const FlashcardRecallPayloadSchema = z.object({
  type: z.literal("flashcard_recall"),
  front_prompt: z.string().min(1),
  back_answer: z.string().min(1),
  hint: z.string().optional(),
  key_terms: z.array(z.string()).default([]),
});

export const TrueFalsePayloadSchema = z.object({
  type: z.literal("true_false"),
  statement: z.string().min(1),
  is_true: z.boolean(),
  explanation: z.string().min(1),
});

export const QuizPayloadSchema = z.discriminatedUnion("type", [
  MultipleChoicePayloadSchema,
  FlashcardRecallPayloadSchema,
  TrueFalsePayloadSchema,
]);

export type MultipleChoiceOption = z.infer<typeof MultipleChoiceOptionSchema>;
export type MultipleChoicePayload = z.infer<typeof MultipleChoicePayloadSchema>;
export type FlashcardRecallPayload = z.infer<typeof FlashcardRecallPayloadSchema>;
export type TrueFalsePayload = z.infer<typeof TrueFalsePayloadSchema>;
export type QuizPayload = z.infer<typeof QuizPayloadSchema>;
export type QuizType = QuizPayload["type"];

/**
 * Skema Autentikasi & Pengguna
 */
export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  full_name: z.string().min(1),
  avatar_seed: z.string().min(1),
  xp: z.number().int().nonnegative(),
  level: z.number().int().positive(),
  xp_current_level_floor: z.number().int().nonnegative(),
  xp_next_level_target: z.number().int().positive(),
  current_streak: z.number().int().nonnegative(),
  longest_streak: z.number().int().nonnegative(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

export const AuthTokenResponseSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  token_type: z.literal("bearer"),
  user: UserProfileSchema,
});

export type AuthTokenResponse = z.infer<typeof AuthTokenResponseSchema>;

export const LoginRequestSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(6, "Kata sandi minimal 6 karakter"),
});

export const RegisterRequestSchema = z.object({
  full_name: z.string().min(2, "Nama lengkap minimal 2 karakter"),
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(6, "Kata sandi minimal 6 karakter"),
});

/**
 * Skema Kursus, Pelajaran Mikro & Checkpoint
 */
export const LessonCheckpointSchema = z.object({
  id: z.string().min(1),
  at_seconds: z.number().int().nonnegative(),
  title: z.string().min(1),
  quiz_id: z.string().uuid(),
});

export type LessonCheckpoint = z.infer<typeof LessonCheckpointSchema>;

export const LessonSummarySchema = z.object({
  id: z.string().uuid(),
  course_id: z.string().uuid(),
  order_index: z.number().int().nonnegative(),
  title: z.string().min(1),
  summary: z.string().min(1),
  transcript: z.string().min(1),
  video_url: z.string().nullable(),
  duration_seconds: z.number().int().positive(),
  checkpoints: z.array(LessonCheckpointSchema),
  watched_seconds: z.number().int().nonnegative().default(0),
  cleared_checkpoints: z.array(z.string()).default([]),
  is_completed: z.boolean().default(false),
});

export type LessonSummary = z.infer<typeof LessonSummarySchema>;

export const CourseSummarySchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  category: z.string().min(1),
  difficulty: z.string().min(1),
  estimated_minutes: z.number().int().positive(),
  lesson_count: z.number().int().nonnegative(),
  completed_lessons: z.number().int().nonnegative().default(0),
});

export type CourseSummary = z.infer<typeof CourseSummarySchema>;

export const CourseDetailSchema = CourseSummarySchema.extend({
  lessons: z.array(LessonSummarySchema),
});

export type CourseDetail = z.infer<typeof CourseDetailSchema>;

/**
 * Skema Kuis & Submit Jawaban
 */
export const QuizItemSchema = z.object({
  id: z.string().uuid(),
  lesson_id: z.string().uuid().nullable(),
  title: z.string().min(1),
  quiz_type: z.enum(["multiple_choice", "flashcard_recall", "true_false"]),
  xp_reward: z.number().int().positive(),
  checkpoint_seconds: z.number().int().nullable(),
  question_payload: QuizPayloadSchema,
});

export type QuizItem = z.infer<typeof QuizItemSchema>;

export const QuizSubmitRequestSchema = z.object({
  selected_option_id: z.string().optional(),
  selected_boolean: z.boolean().optional(),
  self_recalled: z.boolean().optional(),
  focus_session_id: z.string().uuid().nullable().optional(),
});

export type QuizSubmitRequest = z.infer<typeof QuizSubmitRequestSchema>;

export const QuizSubmitResponseSchema = z.object({
  quiz_id: z.string().uuid(),
  is_correct: z.boolean(),
  xp_earned: z.number().int().nonnegative(),
  multiplier_applied: z.number().int().positive(),
  explanation: z.string().min(1),
  updated_xp: z.number().int().nonnegative(),
  updated_level: z.number().int().positive(),
  leveled_up: z.boolean(),
  leaderboard_rank: z.number().int().positive(),
});

export type QuizSubmitResponse = z.infer<typeof QuizSubmitResponseSchema>;

/**
 * Skema Gamifikasi: Misi Harian, Streak, Leaderboard, Focus Session
 */
export const DailyQuestSchema = z.object({
  id: z.string().uuid(),
  quest_code: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  xp_reward: z.number().int().positive(),
  target_count: z.number().int().positive(),
  current_count: z.number().int().nonnegative(),
  is_completed: z.boolean(),
  is_claimed: z.boolean(),
});

export type DailyQuest = z.infer<typeof DailyQuestSchema>;

export const QuestClaimResponseSchema = z.object({
  quest_id: z.string().uuid(),
  xp_earned: z.number().int().nonnegative(),
  updated_xp: z.number().int().nonnegative(),
  updated_level: z.number().int().positive(),
  quest: DailyQuestSchema,
});

export type QuestClaimResponse = z.infer<typeof QuestClaimResponseSchema>;

export const StreakDaySchema = z.object({
  date: z.string().min(1),
  day_label: z.string().min(1),
  completed: z.boolean(),
  is_today: z.boolean(),
  pomodoro_sessions: z.number().int().nonnegative(),
  xp_earned: z.number().int().nonnegative(),
});

export type StreakDay = z.infer<typeof StreakDaySchema>;

export const LeaderboardEntrySchema = z.object({
  rank: z.number().int().positive(),
  user_id: z.string().uuid(),
  full_name: z.string().min(1),
  avatar_seed: z.string().min(1),
  level: z.number().int().positive(),
  xp: z.number().int().nonnegative(),
  current_streak: z.number().int().nonnegative(),
  is_current_user: z.boolean().default(false),
});

export type LeaderboardEntry = z.infer<typeof LeaderboardEntrySchema>;

export const LeaderboardResponseSchema = z.object({
  entries: z.array(LeaderboardEntrySchema),
  current_user_rank: z.number().int().nonnegative(),
  current_user_xp: z.number().int().nonnegative(),
  source: z.enum(["redis_zset", "memory_zset", "database"]),
});

export type LeaderboardResponse = z.infer<typeof LeaderboardResponseSchema>;

export const FocusSessionSchema = z.object({
  id: z.string().uuid(),
  duration_minutes: z.number().int().positive(),
  tab_violations: z.number().int().nonnegative(),
  multiplier_active: z.number().int().positive(),
  status: z.enum(["active", "completed", "cancelled"]),
  started_at: z.string().min(1),
  completed_at: z.string().nullable(),
});

export type FocusSession = z.infer<typeof FocusSessionSchema>;

export const FocusCompleteResponseSchema = z.object({
  session: FocusSessionSchema,
  xp_earned: z.number().int().nonnegative(),
  updated_xp: z.number().int().nonnegative(),
  updated_level: z.number().int().positive(),
});

export type FocusCompleteResponse = z.infer<typeof FocusCompleteResponseSchema>;

/**
 * Skema Dashboard & Profil Lencana
 */
export const DashboardResponseSchema = z.object({
  user: UserProfileSchema,
  active_course: CourseDetailSchema.nullable(),
  daily_quiz: QuizItemSchema.nullable(),
  streak_calendar: z.array(StreakDaySchema),
  leaderboard_top: z.array(LeaderboardEntrySchema),
  daily_quests: z.array(DailyQuestSchema),
  active_focus_session: FocusSessionSchema.nullable(),
});

export type DashboardResponse = z.infer<typeof DashboardResponseSchema>;

export const BadgeItemSchema = z.object({
  code: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  unlocked: z.boolean(),
  progress_label: z.string().min(1),
  tier: z.enum(["gold", "mint", "cream"]),
});

export type BadgeItem = z.infer<typeof BadgeItemSchema>;

export const QuizAttemptSummarySchema = z.object({
  id: z.string().uuid(),
  quiz_title: z.string().min(1),
  is_correct: z.boolean(),
  xp_earned: z.number().int().nonnegative(),
  multiplier_applied: z.number().int().positive(),
  attempted_at: z.string().min(1),
});

export type QuizAttemptSummary = z.infer<typeof QuizAttemptSummarySchema>;

export const ProfileOverviewSchema = z.object({
  user: UserProfileSchema,
  total_pomodoro_completed: z.number().int().nonnegative(),
  total_focus_minutes: z.number().int().nonnegative(),
  total_quizzes_answered: z.number().int().nonnegative(),
  quiz_accuracy_percent: z.number().int().min(0).max(100),
  total_tab_violations: z.number().int().nonnegative(),
  badges: z.array(BadgeItemSchema),
  recent_attempts: z.array(QuizAttemptSummarySchema),
});

export type ProfileOverview = z.infer<typeof ProfileOverviewSchema>;

/**
 * Skema AI Upload PDF/Teks & AI Tutor
 */
export const FlashcardItemSchema = z.object({
  id: z.string().min(1),
  front: z.string().min(1),
  back: z.string().min(1),
  tag: z.string().min(1),
});

export type FlashcardItem = z.infer<typeof FlashcardItemSchema>;

export const AiDocumentSchema = z.object({
  id: z.string().uuid(),
  source_filename: z.string().nullable(),
  source_type: z.enum(["pdf", "text"]),
  title: z.string().min(1),
  raw_text_excerpt: z.string().min(1),
  summary_bullets: z.array(z.string().min(1)),
  flashcards: z.array(FlashcardItemSchema),
  generated_quizzes: z.array(QuizPayloadSchema),
  created_at: z.string().min(1),
});

export type AiDocument = z.infer<typeof AiDocumentSchema>;

export const TutorHistoryMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
});

export type TutorHistoryMessage = z.infer<typeof TutorHistoryMessageSchema>;

export const AiTutorRequestSchema = z.object({
  message: z.string().min(1, "Pesan tidak boleh kosong"),
  history: z.array(TutorHistoryMessageSchema).default([]),
  lesson_context: z.string().nullable().optional(),
  lesson_id: z.string().uuid().nullable().optional(),
});

export type AiTutorRequest = z.infer<typeof AiTutorRequestSchema>;

export const AiTutorResponseSchema = z.object({
  answer: z.string().min(1),
  suggested_followups: z.array(z.string().min(1)),
  provider: z.enum(["gemini", "openai", "fallback"]),
});

export type AiTutorResponse = z.infer<typeof AiTutorResponseSchema>;
