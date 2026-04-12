import React from 'react';
import Icon from '../../../components/AppIcon';

const HostingSectionPlaceholder = ({ title, description, icon }) => {
  return (
    <div className="bg-card border border-border rounded-lg p-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
          <Icon name={icon} size={18} />
        </div>
        <h2 className="text-xl font-heading font-semibold text-foreground">{title}</h2>
      </div>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
};

export default HostingSectionPlaceholder;
