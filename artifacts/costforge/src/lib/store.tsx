import { createContext, useContext, useEffect, useReducer, ReactNode } from "react";
import { Project, Service, PricingVariant, INITIAL_SERVICES, INITIAL_VARIANTS, INITIAL_PROJECTS, ServiceCategory, PricingModelType } from "./mock-data";

interface AppState {
  projects: Project[];
  services: Service[];
  variants: PricingVariant[];
  votes: Record<string, number>; // variantId -> net votes user cast (-1, 0, 1)
}

type Action =
  | { type: "ADD_PROJECT"; payload: Project }
  | { type: "UPDATE_PROJECT"; payload: Project }
  | { type: "DELETE_PROJECT"; payload: string }
  | { type: "ADD_SERVICE"; payload: Service }
  | { type: "ADD_VARIANT"; payload: PricingVariant }
  | { type: "VOTE_VARIANT"; payload: { variantId: string; vote: 1 | -1 | 0 } }
  | { type: "RESET_DATA" };

const initialState: AppState = {
  projects: INITIAL_PROJECTS,
  services: INITIAL_SERVICES,
  variants: INITIAL_VARIANTS,
  votes: {}
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "ADD_PROJECT":
      return { ...state, projects: [...state.projects, action.payload] };
    case "UPDATE_PROJECT":
      return {
        ...state,
        projects: state.projects.map((p) => (p.id === action.payload.id ? action.payload : p))
      };
    case "DELETE_PROJECT":
      return { ...state, projects: state.projects.filter((p) => p.id !== action.payload) };
    case "ADD_SERVICE":
      return { ...state, services: [...state.services, action.payload] };
    case "ADD_VARIANT":
      return { ...state, variants: [...state.variants, action.payload] };
    case "VOTE_VARIANT": {
      const { variantId, vote } = action.payload;
      const currentVote = state.votes[variantId] || 0;
      
      if (currentVote === vote) return state; // No change

      const diff = vote - currentVote;
      
      return {
        ...state,
        votes: { ...state.votes, [variantId]: vote },
        variants: state.variants.map(v => 
          v.id === variantId 
            ? { 
                ...v, 
                upvotes: v.upvotes + (vote === 1 ? 1 : currentVote === 1 ? -1 : 0),
                downvotes: v.downvotes + (vote === -1 ? 1 : currentVote === -1 ? -1 : 0)
              } 
            : v
        )
      };
    }
    case "RESET_DATA":
      return initialState;
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY = "costforge_app_state";

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState, (initial) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : initial;
    } catch (e) {
      console.error("Failed to load state from localStorage", e);
      return initial;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export function useAppStore() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppStore must be used within AppProvider");
  return context;
}
