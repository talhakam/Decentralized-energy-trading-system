// components/ui/tabs.jsx
import React from 'react';

const Tabs = ({ children, value, onChange }) => {
  return (
    <div className="tabs">
      {children}
    </div>
  );
};

const TabsList = ({ children }) => {
  return (
    <div className="tabs-list">
      {children}
    </div>
  );
};

const TabsTrigger = ({ children, value, onClick }) => {
  return (
    <button
      className={`tabs-trigger ${value === children.props.value ? 'active' : ''}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

const TabsContent = ({ children, value }) => {
  return (
    <div className="tabs-content">
      {children}
    </div>
  );
};

export { Tabs, TabsList, TabsTrigger, TabsContent };