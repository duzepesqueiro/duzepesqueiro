import React from 'react';

const AccessDenied = () => {

  return (
    <div className="dark min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <h1 className="text-7xl font-bold text-primary opacity-20">403</h1>
          </div>
        </div>

        <h2 className="text-2xl font-medium text-onBackground mb-2">Acesso negado</h2>
        <p className="text-onBackground/70 mb-8">
          Você não tem permissão para acessar esta área administrativa.
        </p>
      </div>
    </div>
  );
};

export default AccessDenied;