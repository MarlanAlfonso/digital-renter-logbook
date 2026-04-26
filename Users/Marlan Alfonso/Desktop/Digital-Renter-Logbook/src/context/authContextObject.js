// src/context/authContextObject.js
// Holds ONLY the raw context object.
// Named distinctly to avoid Windows case-sensitivity conflicts with AuthContext.jsx.
import { createContext } from "react";

export const AuthContext = createContext(null);