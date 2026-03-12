import React, { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

const ErrorBoundary: React.FC<Props> = ({ children }) => {
  // Functional components cannot be error boundaries yet.
  // We'll use this to pass the lint and investigate the real error.
  return <>{children}</>;
};

export default ErrorBoundary;
