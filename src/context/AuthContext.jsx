// src/context/AuthContext.jsx
"use client"
import React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { toast } from 'sonner';

const AuthContext = createContext(undefined)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [allowedSteps, setAllowedSteps] = useState([]);

  // --- HARDCODED GOOGLE SHEET CONFIGURATION ---
  const SHEET_ID = "19Za1BvjKvHT01rzDOPLS_MErnuEJd6__l7C_4lUgLlg"; // Your Google Sheet ID
  const SHEET_NAME = "Login"; // The exact name of your login sheet tab
  // --- END HARDCODED CONFIG ---

  // --- FIXED COLUMN INDICES (0-indexed) ---
  const USERNAME_COL_INDEX = 0; // Column A
  const PASSWORD_COL_INDEX = 1; // Column B
  const STEPS_COL_INDEX = 2;    // Column C
  // --- END FIXED COLUMN INDICES ---

  useEffect(() => {
    const initializeAuth = async () => {
      const authStatus = localStorage.getItem("isAuthenticated");
      const userData = localStorage.getItem("user");
      const userSteps = localStorage.getItem("allowedSteps");

      if (authStatus === "true" && userData) {
        const parsedUser = JSON.parse(userData);
        setIsAuthenticated(true);
        setUser(parsedUser);
        if (userSteps) {
          setAllowedSteps(JSON.parse(userSteps));
        } else {
          // If allowedSteps are not in localStorage, fetch them.
          // This might happen if localStorage was cleared or this is an older session.
          await fetchUserRoles(parsedUser.username);
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const fetchUserRoles = async (username) => {
    try {
      const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(SHEET_NAME)}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch user roles: ${response.status} ${response.statusText}`);
      }

      let text = await response.text();
      const jsonpStart = "google.visualization.Query.setResponse(";
      if (text.startsWith(jsonpStart)) {
        text = text.substring(jsonpStart.length, text.length - 2);
      } else {
        const jsonStartIndex = text.indexOf('{');
        const jsonEndIndex = text.lastIndexOf('}');
        if (jsonStartIndex === -1 || jsonEndIndex === -1 || jsonEndIndex <= jsonStartIndex) {
          throw new Error("Invalid response format from Google Sheets for user roles.");
        }
        text = text.substring(jsonStartIndex, jsonEndIndex + 1);
      }
      const data = JSON.parse(text);

      if (data.status === 'error' || !data.table || !data.table.rows) {
        console.error("Error or no user data in Login sheet (fetchUserRoles):", data);
        setAllowedSteps([]);
        localStorage.setItem("allowedSteps", JSON.stringify([]));
        return [];
      }

      let userRoles = [];
      let userFound = false;
      data.table.rows.forEach(row => {
        if (userFound) return; // Optimization if usernames are unique

        const rowUsername = row.c[USERNAME_COL_INDEX]?.v;
        const rowStepsCellValue = row.c[STEPS_COL_INDEX]?.v;

        if (rowUsername && rowUsername.toLowerCase() === username.toLowerCase()) {
          const stepsString = (rowStepsCellValue || "").trim().toLowerCase();
          if (stepsString === "all") {
            userRoles = ["Admin"]; // Assign "Admin" role for full access
          } else {
            userRoles = (rowStepsCellValue || "").split(',').map(step => step.trim()).filter(step => step); // Filter out empty strings
          }
          userFound = true;
        }
      });

      localStorage.setItem("allowedSteps", JSON.stringify(userRoles));
      setAllowedSteps(userRoles);
      return userRoles;

    } catch (error) {
      console.error("Failed to fetch user roles:", error);
      toast.error("Role Fetch Error", { description: `Failed to load user roles: ${error.message}` });
      setAllowedSteps([]);
      localStorage.setItem("allowedSteps", JSON.stringify([]));
      return [];
    }
  };


  const login = async (username, password) => {
    return new Promise(async (resolve) => {
      try {
        const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(SHEET_NAME)}`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch login data: ${response.status} ${response.statusText}`);
        }

        let text = await response.text();
        const jsonpStart = "google.visualization.Query.setResponse(";
        if (text.startsWith(jsonpStart)) {
          text = text.substring(jsonpStart.length, text.length - 2);
        } else {
          const jsonStartIndex = text.indexOf('{');
          const jsonEndIndex = text.lastIndexOf('}');
          if (jsonStartIndex === -1 || jsonEndIndex === -1 || jsonEndIndex <= jsonStartIndex) {
            throw new Error("Invalid response format from Google Sheets for login.");
          }
          text = text.substring(jsonStartIndex, jsonEndIndex + 1);
        }
        const data = JSON.parse(text);

        if (data.status === 'error' || !data.table || !data.table.rows) {
          console.error("Error or no data in Login sheet for login:", data);
          toast.error("Login Failed", { description: "Could not retrieve login information." });
          resolve(false);
          return;
        }

        let authenticated = false;
        let userFoundRoles = [];

        for (const row of data.table.rows) { // Use for...of to allow break
          const storedUsername = row.c[USERNAME_COL_INDEX]?.v;
          const storedPassword = row.c[PASSWORD_COL_INDEX]?.v;
          const storedStepsCellValue = row.c[STEPS_COL_INDEX]?.v;

          if (storedUsername && storedUsername.toLowerCase() === username.toLowerCase() && storedPassword === password) {
            authenticated = true;
            const stepsString = (storedStepsCellValue || "").trim().toLowerCase();
            if (stepsString === "all") {
              userFoundRoles = ["Admin"]; // Assign "Admin" role for full access
            } else {
              userFoundRoles = (storedStepsCellValue || "").split(',').map(step => step.trim()).filter(step => step); // Filter out empty strings
            }
            break; // User found and authenticated, no need to check further
          }
        }

        if (authenticated) {
          const userData = { username };
          localStorage.setItem("isAuthenticated", "true");
          localStorage.setItem("user", JSON.stringify(userData));
          localStorage.setItem("allowedSteps", JSON.stringify(userFoundRoles));

          setUser(userData);
          setIsAuthenticated(true);
          setAllowedSteps(userFoundRoles);
          toast.success("Login Successful", { description: "Welcome to the Purchase Management System." });
          resolve(true);
          window.location.reload(); // FORCED RELOAD ON SUCCESSFUL LOGIN
        } else {
          toast.error("Login Failed", { description: "Invalid username or password. Please try again." });
          resolve(false);
        }
      } catch (error) {
        console.error("Login process error:", error);
        toast.error("Login Error", { description: `An error occurred during login: ${error.message}` });
        resolve(false);
      }
    });
  };

  const logout = () => {
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("user");
    localStorage.removeItem("allowedSteps");
    setIsAuthenticated(false);
    setUser(null);
    setAllowedSteps([]);
    toast.info("Logged Out", { description: "You have been successfully logged out." });
    window.location.reload(); // FORCED RELOAD ON LOGOUT
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, allowedSteps, login, logout, isLoading }}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}