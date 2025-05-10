import { 
  InsertUser, User, 
  InsertPlayer, Player,
  InsertQuestion, Question,
  InsertGameSession, GameSession,
  InsertPlayerAnswer, PlayerAnswer
} from "@shared/schema";
import { demoQuestions } from "@shared/questions";

// Storage interface 
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Player methods
  getPlayer(id: number): Promise<Player | undefined>;
  getPlayerBySessionId(sessionId: string): Promise<Player | undefined>;
  getAllPlayers(): Promise<Player[]>;
  createPlayer(player: InsertPlayer): Promise<Player>;
  updatePlayerScore(id: number, score: number): Promise<Player>;
  
  // Question methods
  getQuestion(id: number): Promise<Question | undefined>;
  getAllQuestions(): Promise<Question[]>;
  getQuestionsByType(type: string): Promise<Question[]>;
  createQuestion(question: InsertQuestion): Promise<Question>;
  
  // Game session methods
  getGameSession(id: number): Promise<GameSession | undefined>;
  getActiveGameSession(): Promise<GameSession | undefined>;
  createGameSession(session: InsertGameSession): Promise<GameSession>;
  updateGameSession(id: number, updates: Partial<InsertGameSession>): Promise<GameSession>;
  
  // Player answer methods
  getPlayerAnswer(id: number): Promise<PlayerAnswer | undefined>;
  getPlayerAnswers(playerId: number): Promise<PlayerAnswer[]>;
  getAnswersForQuestion(questionId: number): Promise<PlayerAnswer[]>;
  createPlayerAnswer(answer: InsertPlayerAnswer): Promise<PlayerAnswer>;
  
  // Special methods
  getLeaderboard(): Promise<Player[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private players: Map<number, Player>;
  private questions: Map<number, Question>;
  private gameSessions: Map<number, GameSession>;
  private playerAnswers: Map<number, PlayerAnswer>;
  
  private userId: number;
  private playerId: number;
  private questionId: number;
  private gameSessionId: number;
  private playerAnswerId: number;

  constructor() {
    this.users = new Map();
    this.players = new Map();
    this.questions = new Map();
    this.gameSessions = new Map();
    this.playerAnswers = new Map();
    
    this.userId = 1;
    this.playerId = 1;
    this.questionId = 1;
    this.gameSessionId = 1;
    this.playerAnswerId = 1;
    
    // Initialize with demo questions
    this.initializeQuestions();
  }
  
  private initializeQuestions(): void {
    for (const question of demoQuestions) {
      this.questions.set(question.id, question);
      if (question.id >= this.questionId) {
        this.questionId = question.id + 1;
      }
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user: User = { 
      ...insertUser, 
      id,
      isAdmin: insertUser.isAdmin || false
    };
    this.users.set(id, user);
    return user;
  }
  
  // Player methods
  async getPlayer(id: number): Promise<Player | undefined> {
    return this.players.get(id);
  }
  
  async getPlayerBySessionId(sessionId: string): Promise<Player | undefined> {
    return Array.from(this.players.values()).find(
      (player) => player.sessionId === sessionId
    );
  }
  
  async getAllPlayers(): Promise<Player[]> {
    return Array.from(this.players.values());
  }
  
  async createPlayer(insertPlayer: InsertPlayer): Promise<Player> {
    const id = this.playerId++;
    const player: Player = { ...insertPlayer, id, score: 0, createdAt: new Date() };
    this.players.set(id, player);
    return player;
  }
  
  async updatePlayerScore(id: number, score: number): Promise<Player> {
    const player = this.players.get(id);
    if (!player) {
      throw new Error(`Player with id ${id} not found`);
    }
    
    const updatedPlayer = { ...player, score };
    this.players.set(id, updatedPlayer);
    return updatedPlayer;
  }
  
  // Question methods
  async getQuestion(id: number): Promise<Question | undefined> {
    return this.questions.get(id);
  }
  
  async getAllQuestions(): Promise<Question[]> {
    return Array.from(this.questions.values());
  }
  
  async getQuestionsByType(type: string): Promise<Question[]> {
    return Array.from(this.questions.values()).filter(
      (question) => question.type === type
    );
  }
  
  async createQuestion(insertQuestion: InsertQuestion): Promise<Question> {
    const id = this.questionId++;
    const question: Question = { 
      ...insertQuestion, 
      id,
      options: insertQuestion.options || null 
    };
    this.questions.set(id, question);
    return question;
  }
  
  // Game session methods
  async getGameSession(id: number): Promise<GameSession | undefined> {
    return this.gameSessions.get(id);
  }
  
  async getActiveGameSession(): Promise<GameSession | undefined> {
    return Array.from(this.gameSessions.values()).find(
      (session) => session.status === 'active'
    );
  }
  
  async createGameSession(insertSession: InsertGameSession): Promise<GameSession> {
    const id = this.gameSessionId++;
    const session: GameSession = { 
      ...insertSession, 
      id, 
      createdAt: new Date(),
      currentQuestionId: insertSession.currentQuestionId || null
    };
    this.gameSessions.set(id, session);
    return session;
  }
  
  async updateGameSession(id: number, updates: Partial<InsertGameSession>): Promise<GameSession> {
    const session = this.gameSessions.get(id);
    if (!session) {
      throw new Error(`Game session with id ${id} not found`);
    }
    
    const updatedSession = { ...session, ...updates };
    this.gameSessions.set(id, updatedSession);
    return updatedSession;
  }
  
  // Player answer methods
  async getPlayerAnswer(id: number): Promise<PlayerAnswer | undefined> {
    return this.playerAnswers.get(id);
  }
  
  async getPlayerAnswers(playerId: number): Promise<PlayerAnswer[]> {
    return Array.from(this.playerAnswers.values()).filter(
      (answer) => answer.playerId === playerId
    );
  }
  
  async getAnswersForQuestion(questionId: number): Promise<PlayerAnswer[]> {
    return Array.from(this.playerAnswers.values()).filter(
      (answer) => answer.questionId === questionId
    );
  }
  
  async createPlayerAnswer(insertAnswer: InsertPlayerAnswer): Promise<PlayerAnswer> {
    const id = this.playerAnswerId++;
    const answer: PlayerAnswer = { 
      ...insertAnswer, 
      id, 
      createdAt: new Date(),
      timeToAnswer: insertAnswer.timeToAnswer || null
    };
    this.playerAnswers.set(id, answer);
    
    // Update player score
    const player = this.players.get(answer.playerId);
    if (player) {
      const updatedScore = (player.score || 0) + answer.pointsAwarded;
      this.updatePlayerScore(player.id, updatedScore);
    }
    
    return answer;
  }
  
  // Special methods
  async getLeaderboard(): Promise<Player[]> {
    return Array.from(this.players.values())
      .sort((a, b) => (b.score || 0) - (a.score || 0));
  }
}

export const storage = new MemStorage();
