import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";
import { WebSocketProvider } from "./lib/socket";
import { SocketMessage, PlayerInfo } from "./types";

import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Admin from "@/pages/Admin";
import Player from "@/pages/Player";
import LiveScore from "@/pages/LiveScore";
import Header from "@/components/Header";

function App() {
  const [user, setUser] = useState<PlayerInfo | null>(null);

  // Handle user login
  const handleLogin = (userData: PlayerInfo) => {
    setUser(userData);
  };

  // Handle user logout
  const handleLogout = () => {
    setUser(null);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WebSocketProvider>
          <div className="flex flex-col min-h-screen">
            <Header user={user} onLogout={handleLogout} />
            <main className="flex-grow">
              <Switch>
                <Route path="/" component={() => <Home onLogin={handleLogin} />} />
                <Route path="/admin" component={() => <Admin />} />
                <Route path="/player" component={() => <Player user={user} onLogin={handleLogin} />} />
                <Route path="/live-score" component={() => <LiveScore />} />
                <Route component={NotFound} />
              </Switch>
            </main>
            <Toaster />
          </div>
        </WebSocketProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
