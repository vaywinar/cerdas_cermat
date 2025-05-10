import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { z } from "zod";
import { insertPlayerSchema, insertPlayerAnswerSchema, insertGameSessionSchema } from "@shared/schema";

interface ClientConnection {
  socket: WebSocket;
  id: string;
  type: 'admin' | 'player' | 'spectator';
  playerId?: number;
}

interface BuzzerState {
  active: boolean;
  firstPlayer?: ClientConnection;
  timestamp?: number;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Configure WebSocket server with more robust options
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws',
    clientTracking: true,
    perMessageDeflate: {
      zlibDeflateOptions: {
        chunkSize: 1024,
        memLevel: 7,
        level: 3
      },
      zlibInflateOptions: {
        chunkSize: 10 * 1024
      },
      concurrencyLimit: 10,
      threshold: 1024
    }
  });
  
  // Connected clients
  const clients: ClientConnection[] = [];
  
  // Game state
  let currentGameSession: any = null;
  let currentQuestion: any = null;
  let timeLeft: number = 0;
  let questionTimer: NodeJS.Timeout | null = null;
  let buzzerState: BuzzerState = { active: false };
  
  // Track question answering states
  const answeringPlayers = new Set<number>();
  
  // Handle WebSocket connections
  wss.on('connection', (socket) => {
    const clientId = Math.random().toString(36).substr(2, 9);
    const client: ClientConnection = { socket, id: clientId, type: 'spectator' };
    clients.push(client);
    
    console.log(`Client connected: ${clientId}`);
    
    // If game is in progress, send current game state
    if (currentGameSession) {
      socket.send(JSON.stringify({
        type: 'gameState',
        data: {
          gameSession: currentGameSession,
          question: currentQuestion,
          timeLeft
        }
      }));
    }
    
    // Handle messages from clients
    socket.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log(`Message received from ${clientId}:`, data.type);
        
        switch (data.type) {
          case 'register':
            await handleRegister(client, data.data);
            break;
          
          case 'startGame':
            if (client.type === 'admin') {
              await handleStartGame(data.data);
            } else {
              socket.send(JSON.stringify({
                type: 'error',
                error: 'Only admins can start a game'
              }));
            }
            break;
          
          case 'nextQuestion':
            if (client.type === 'admin') {
              await handleNextQuestion();
            } else {
              socket.send(JSON.stringify({
                type: 'error',
                error: 'Only admins can control questions'
              }));
            }
            break;
          
          case 'selectPlayer':
            if (client.type === 'admin' && currentGameSession?.mode === 'manual') {
              await handleSelectPlayer(data.data);
            } else {
              socket.send(JSON.stringify({
                type: 'error',
                error: 'Only admins can select players in manual mode'
              }));
            }
            break;
          
          case 'submitAnswer':
            if (client.type === 'player') {
              await handleSubmitAnswer(client, data.data);
            } else {
              socket.send(JSON.stringify({
                type: 'error',
                error: 'Only players can submit answers'
              }));
            }
            break;
          
          case 'pressBuzzer':
            if (client.type === 'player' && 
                currentGameSession?.round === 2 && 
                currentGameSession?.mode === 'manual') {
              await handlePressBuzzer(client);
            } else {
              socket.send(JSON.stringify({
                type: 'error',
                error: 'Buzzer can only be used in round 2 manual mode by players'
              }));
            }
            break;
          
          case 'endGame':
            if (client.type === 'admin') {
              await handleEndGame();
            } else {
              socket.send(JSON.stringify({
                type: 'error',
                error: 'Only admins can end a game'
              }));
            }
            break;
            
          default:
            console.warn(`Unknown message type: ${data.type}`);
            socket.send(JSON.stringify({
              type: 'error',
              error: `Unknown message type: ${data.type}`
            }));
            break;
        }
      } catch (error) {
        console.error('Error processing message:', error);
        socket.send(JSON.stringify({
          type: 'error',
          error: 'Failed to process message',
          details: error instanceof Error ? error.message : String(error)
        }));
      }
    });
    
    // Handle disconnection
    socket.on('close', () => {
      const index = clients.findIndex(c => c.id === client.id);
      if (index !== -1) {
        clients.splice(index, 1);
      }
      
      console.log(`Client disconnected: ${clientId}`);
      
      // Broadcast updated player list
      broadcastPlayerList();
    });
  });
  
  // Player registration
  async function handleRegister(client: ClientConnection, data: any) {
    try {
      console.log(`Processing registration for role: ${data.role}`);
      
      if (!data || !data.role) {
        throw new Error('Missing registration data or role');
      }

      if (data.role === 'admin') {
        client.type = 'admin';
        console.log(`Client ${client.id} registered as admin`);
        client.socket.send(JSON.stringify({
          type: 'registerResponse',
          success: true,
          data: {
            role: 'admin'
          }
        }));
      } else if (data.role === 'player') {
        if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
          throw new Error('Player name is required');
        }
        
        const validateData = insertPlayerSchema.parse({
          name: data.name,
          sessionId: client.id
        });
        
        // Look for existing player with same session ID
        let player = await storage.getPlayerBySessionId(client.id);
        
        // If player doesn't exist, create a new one
        if (!player) {
          player = await storage.createPlayer(validateData);
        }
        
        client.type = 'player';
        client.playerId = player.id;
        
        console.log(`Client ${client.id} registered as player: ${player.name} (ID: ${player.id})`);
        
        client.socket.send(JSON.stringify({
          type: 'registerResponse',
          success: true,
          data: {
            role: 'player',
            player
          }
        }));
        
        // Broadcast updated player list
        broadcastPlayerList();
      } else if (data.role === 'spectator') {
        client.type = 'spectator';
        console.log(`Client ${client.id} registered as spectator`);
        client.socket.send(JSON.stringify({
          type: 'registerResponse',
          success: true,
          data: {
            role: 'spectator'
          }
        }));
      } else {
        throw new Error(`Invalid role: ${data.role}`);
      }
    } catch (error) {
      console.error('Registration error:', error);
      client.socket.send(JSON.stringify({
        type: 'registerResponse',
        success: false,
        error: error instanceof Error ? error.message : 'Invalid registration data'
      }));
    }
  }
  
  // Start a new game session
  async function handleStartGame(data: any) {
    try {
      // End any existing game
      if (currentGameSession) {
        await handleEndGame();
      }
      
      // Validate game session data
      const validatedData = insertGameSessionSchema.parse({
        round: data.round,
        mode: data.mode,
        status: 'active',
        currentQuestionId: null
      });
      
      // Create new game session
      currentGameSession = await storage.createGameSession(validatedData);
      
      // Reset game state
      currentQuestion = null;
      timeLeft = 0;
      buzzerState = { active: false };
      answeringPlayers.clear();
      
      // Broadcast game start to all clients
      broadcastToAll({
        type: 'gameStarted',
        data: {
          gameSession: currentGameSession
        }
      });
      
      console.log(`Game started: Round ${data.round}, Mode ${data.mode}`);
      
      // Auto select first question in auto mode
      if (data.mode === 'auto') {
        await handleNextQuestion();
      }
    } catch (error) {
      console.error('Start game error:', error);
      broadcastToAdmins({
        type: 'error',
        error: 'Failed to start game'
      });
    }
  }
  
  // Move to the next question
  async function handleNextQuestion() {
    try {
      if (!currentGameSession) {
        throw new Error('No active game session');
      }
      
      // Cancel any existing timer
      if (questionTimer) {
        clearTimeout(questionTimer);
        questionTimer = null;
      }
      
      // Reset buzzer state
      buzzerState = { active: false };
      answeringPlayers.clear();
      
      // Get questions matching the current round
      const questionType = currentGameSession.round === 1 ? 'multiple_choice' : 'short_answer';
      const availableQuestions = await storage.getQuestionsByType(questionType);
      
      // Find a question that hasn't been used yet
      const usedQuestionIds = new Set();
      if (currentGameSession.currentQuestionId) {
        usedQuestionIds.add(currentGameSession.currentQuestionId);
      }
      
      const eligibleQuestions = availableQuestions.filter(q => !usedQuestionIds.has(q.id));
      
      if (eligibleQuestions.length === 0) {
        throw new Error('No more questions available');
      }
      
      // Select a random question
      const randomIndex = Math.floor(Math.random() * eligibleQuestions.length);
      currentQuestion = eligibleQuestions[randomIndex];
      
      // Update game session with current question
      currentGameSession = await storage.updateGameSession(
        currentGameSession.id, 
        { currentQuestionId: currentQuestion.id }
      );
      
      // Set timer for automatic mode (30 seconds)
      if (currentGameSession.mode === 'auto') {
        timeLeft = 30;
        startQuestionTimer();
      } else if (currentGameSession.round === 2) {
        // For manual mode in round 2, activate buzzer
        buzzerState.active = true;
      }
      
      // Broadcast new question to all clients
      broadcastToAll({
        type: 'newQuestion',
        data: {
          question: currentQuestion,
          timeLeft: timeLeft,
          buzzerActive: buzzerState.active
        }
      });
      
      console.log(`New question: ${currentQuestion.text}`);
    } catch (error) {
      console.error('Next question error:', error);
      broadcastToAdmins({
        type: 'error',
        error: 'Failed to get next question'
      });
    }
  }
  
  // Handle buzzer presses for round 2 manual mode
  async function handlePressBuzzer(client: ClientConnection) {
    try {
      if (!currentQuestion || !buzzerState.active || !client.playerId) {
        return;
      }
      
      // If this is the first player to press the buzzer
      if (!buzzerState.firstPlayer) {
        buzzerState.firstPlayer = client;
        buzzerState.timestamp = Date.now();
        
        // Get player data
        const player = await storage.getPlayer(client.playerId);
        
        // Notify all clients about who pressed the buzzer first
        broadcastToAll({
          type: 'buzzerPressed',
          data: {
            playerId: client.playerId,
            playerName: player?.name
          }
        });
        
        // Notify the player that they can answer
        client.socket.send(JSON.stringify({
          type: 'buzzerSuccess',
          data: {
            canAnswer: true
          }
        }));
        
        console.log(`Player ${player?.name} pressed buzzer first`);
      } else {
        // Notify the player they were not first
        client.socket.send(JSON.stringify({
          type: 'buzzerFail',
          data: {
            canAnswer: false
          }
        }));
      }
    } catch (error) {
      console.error('Buzzer error:', error);
      client.socket.send(JSON.stringify({
        type: 'error',
        error: 'Failed to process buzzer action'
      }));
    }
  }
  
  // Allow admin to select a player in manual mode
  async function handleSelectPlayer(data: any) {
    try {
      const playerId = data.playerId;
      if (!playerId) {
        throw new Error('No player selected');
      }
      
      // Find the client for this player
      const playerClient = clients.find(c => c.playerId === playerId);
      if (!playerClient) {
        throw new Error('Player not found');
      }
      
      // Notify the player they are selected
      playerClient.socket.send(JSON.stringify({
        type: 'playerSelected',
        data: { canAnswer: true }
      }));
      
      // Notify all clients about who is selected
      broadcastToAll({
        type: 'playerSelectionChanged',
        data: { 
          selectedPlayerId: playerId,
          playerName: (await storage.getPlayer(playerId))?.name
        }
      });
    } catch (error) {
      console.error('Select player error:', error);
      broadcastToAdmins({
        type: 'error',
        error: 'Failed to select player'
      });
    }
  }
  
  // Handle answer submission
  async function handleSubmitAnswer(client: ClientConnection, data: any) {
    try {
      if (!currentQuestion || !client.playerId) {
        return;
      }
      
      // Check if player has already answered this question
      if (answeringPlayers.has(client.playerId)) {
        return;
      }
      
      // In manual mode round 2, only the selected player can answer
      if (currentGameSession.mode === 'manual' && 
          currentGameSession.round === 2 && 
          buzzerState.firstPlayer?.id !== client.id) {
        return;
      }
      
      // Check answer
      let isCorrect = false;
      const playerAnswer = data.answer.trim();
      
      if (currentQuestion.type === 'multiple_choice') {
        const options = JSON.parse(currentQuestion.options as string);
        const selectedIndex = ['a', 'b', 'c', 'd'].indexOf(playerAnswer.toLowerCase());
        if (selectedIndex >= 0 && selectedIndex < options.length) {
          isCorrect = options[selectedIndex] === currentQuestion.correctAnswer;
        }
      } else {
        // For short answers, do case-insensitive comparison
        isCorrect = playerAnswer.toLowerCase() === currentQuestion.correctAnswer.toLowerCase();
      }
      
      // Calculate points
      const pointsAwarded = isCorrect 
        ? currentQuestion.points 
        : -currentQuestion.wrongAnswerPenalty;
      
      // Record the answer
      const playerAnswerData = {
        playerId: client.playerId,
        questionId: currentQuestion.id,
        answer: playerAnswer,
        isCorrect,
        pointsAwarded,
        timeToAnswer: Date.now() - (buzzerState.timestamp || Date.now())
      };
      
      const answer = await storage.createPlayerAnswer(playerAnswerData);
      
      // Mark player as having answered
      answeringPlayers.add(client.playerId);
      
      // Get player info
      const player = await storage.getPlayer(client.playerId);
      
      // Notify the player of their result
      client.socket.send(JSON.stringify({
        type: 'answerResult',
        data: {
          isCorrect,
          pointsAwarded,
          playerScore: player?.score
        }
      }));
      
      // Broadcast the answer to all clients
      broadcastToAll({
        type: 'playerAnswered',
        data: {
          playerId: client.playerId,
          playerName: player?.name,
          isCorrect,
          pointsAwarded,
          answer: playerAnswer
        }
      });
      
      // Reset buzzer state
      if (currentGameSession.mode === 'manual' && currentGameSession.round === 2) {
        buzzerState = { active: true };
        
        if (isCorrect) {
          // Move to next question if correct in manual mode
          setTimeout(() => {
            handleNextQuestion();
          }, 3000);
        } else {
          // Clear selected player to allow others to answer
          buzzerState.firstPlayer = undefined;
          
          // Notify all clients that buzzer is available again
          broadcastToAll({
            type: 'buzzerReset',
            data: {
              buzzerActive: true
            }
          });
        }
      }
      
      // Send updated leaderboard
      broadcastLeaderboard();
      
      console.log(`Player ${player?.name} answered: ${playerAnswer}, correct: ${isCorrect}, points: ${pointsAwarded}`);
    } catch (error) {
      console.error('Submit answer error:', error);
      client.socket.send(JSON.stringify({
        type: 'error',
        error: 'Failed to submit answer'
      }));
    }
  }
  
  // End the current game
  async function handleEndGame() {
    try {
      if (!currentGameSession) {
        return;
      }
      
      // Update game session
      await storage.updateGameSession(
        currentGameSession.id, 
        { status: 'completed' }
      );
      
      // Cancel timer
      if (questionTimer) {
        clearTimeout(questionTimer);
        questionTimer = null;
      }
      
      // Reset game state
      currentGameSession = null;
      currentQuestion = null;
      timeLeft = 0;
      buzzerState = { active: false };
      
      // Broadcast game end
      broadcastToAll({
        type: 'gameEnded',
        data: {
          message: 'Game has ended'
        }
      });
      
      // Send final leaderboard
      broadcastLeaderboard();
      
      console.log('Game ended');
    } catch (error) {
      console.error('End game error:', error);
      broadcastToAdmins({
        type: 'error',
        error: 'Failed to end game'
      });
    }
  }
  
  // Timer for questions in automatic mode
  function startQuestionTimer() {
    if (questionTimer) {
      clearTimeout(questionTimer);
    }
    
    const tickInterval = 1000; // 1 second
    
    const timerTick = () => {
      timeLeft--;
      
      // Broadcast time update
      broadcastToAll({
        type: 'timeUpdate',
        data: { timeLeft }
      });
      
      if (timeLeft <= 0) {
        // Time's up, show answers and prepare for next question
        broadcastToAll({
          type: 'timeUp',
          data: {
            correctAnswer: currentQuestion.correctAnswer
          }
        });
        
        // Move to the next question after a delay in auto mode
        if (currentGameSession && currentGameSession.mode === 'auto') {
          setTimeout(() => {
            handleNextQuestion();
          }, 3000);
        }
      } else {
        // Continue the timer
        questionTimer = setTimeout(timerTick, tickInterval);
      }
    };
    
    // Start the timer
    questionTimer = setTimeout(timerTick, tickInterval);
  }
  
  // Broadcast to all connected clients
  function broadcastToAll(message: any) {
    const messageStr = JSON.stringify(message);
    clients.forEach(client => {
      if (client.socket.readyState === WebSocket.OPEN) {
        client.socket.send(messageStr);
      }
    });
  }
  
  // Broadcast only to admin clients
  function broadcastToAdmins(message: any) {
    const messageStr = JSON.stringify(message);
    clients.forEach(client => {
      if (client.type === 'admin' && client.socket.readyState === WebSocket.OPEN) {
        client.socket.send(messageStr);
      }
    });
  }
  
  // Broadcast player list to all clients
  async function broadcastPlayerList() {
    try {
      const players = await storage.getAllPlayers();
      broadcastToAll({
        type: 'playerList',
        data: { players }
      });
    } catch (error) {
      console.error('Error broadcasting player list:', error);
    }
  }
  
  // Broadcast leaderboard to all clients
  async function broadcastLeaderboard() {
    try {
      const leaderboard = await storage.getLeaderboard();
      broadcastToAll({
        type: 'leaderboard',
        data: { leaderboard }
      });
    } catch (error) {
      console.error('Error broadcasting leaderboard:', error);
    }
  }
  
  // API Routes
  
  // Get all questions
  app.get('/api/questions', async (req: Request, res: Response) => {
    try {
      const questions = await storage.getAllQuestions();
      res.json(questions);
    } catch (error) {
      console.error('Error fetching questions:', error);
      res.status(500).json({ error: 'Failed to fetch questions' });
    }
  });
  
  // Get leaderboard
  app.get('/api/leaderboard', async (req: Request, res: Response) => {
    try {
      const leaderboard = await storage.getLeaderboard();
      res.json(leaderboard);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
  });
  
  // Get game state
  app.get('/api/game', async (req: Request, res: Response) => {
    try {
      const gameSession = await storage.getActiveGameSession();
      res.json({
        gameSession,
        currentQuestion: gameSession ? currentQuestion : null,
        timeLeft: gameSession ? timeLeft : 0,
        buzzerActive: gameSession ? buzzerState.active : false
      });
    } catch (error) {
      console.error('Error fetching game state:', error);
      res.status(500).json({ error: 'Failed to fetch game state' });
    }
  });

  return httpServer;
}
