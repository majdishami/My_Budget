
import React from 'react';
import { Link } from 'wouter';

const NotFound: React.FC = () => {
  return (
    <div className="container mx-auto p-4 text-center">
      <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
      <p className="mb-4">The page you are looking for does not exist.</p>
      <Link href="/">
        <a className="text-blue-500 hover:underline">Go back to Dashboard</a>
      </Link>
    </div>
  );
};

export default NotFound;
import React from "react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="container mx-auto p-4 text-center">
      <h1 className="text-3xl font-bold mb-6">404 - Page Not Found</h1>
      <p className="mb-4">The page you are looking for does not exist.</p>
      <Link href="/">
        <a className="text-blue-500 hover:underline">Return to Home</a>
      </Link>
    </div>
  );
}
