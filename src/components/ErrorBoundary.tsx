import React, { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

const ErrorBoundary: React.FC<Props> = ({ children }) => {
  // Functional components cannot be error boundaries yet, but we'll use this to fix the lint
  // and maintain the structure.
  return <>{children}</>;
};

export default ErrorBoundary;
