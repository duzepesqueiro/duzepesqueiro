import React, { useState } from 'react';
import Button from './Button';
import Select from './Select';
import Icon from '../AppIcon';

const ExportControlPanel = ({ 
  onExport, 
  availableFormats = ['pdf', 'excel', 'csv', 'png'], 
  className = '',
  title = 'Exportar Dados'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState('pdf');
  const [isExporting, setIsExporting] = useState(false);

  const formatOptions = [
    { value: 'pdf', label: 'Relatório PDF', icon: 'FileText' },
    { value: 'excel', label: 'Planilha Excel', icon: 'FileSpreadsheet' },
    { value: 'csv', label: 'Dados CSV', icon: 'Database' },
    { value: 'png', label: 'Imagem PNG', icon: 'Image' },
    { value: 'json', label: 'Dados JSON', icon: 'Code' },
  ]?.filter(format => availableFormats?.includes(format?.value));

  const togglePanel = () => {
    setIsOpen(!isOpen);
  };

  const handleExport = async () => {
    if (!onExport) return;

    setIsExporting(true);
    try {
      await onExport(selectedFormat);
      setIsOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const getFormatIcon = (format) => {
    const option = formatOptions?.find(opt => opt?.value === format);
    return option?.icon || 'Download';
  };

  return (
    <div className={`relative ${className}`}>
      {/* Export Button */}
      <Button
        variant="outline"
        onClick={togglePanel}
        iconName="Download"
        iconPosition="left"
        className="relative"
      >
        Exportar
      </Button>
      {/* Export Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-[1050]" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Panel */}
          <div className="absolute top-full right-0 mt-2 w-80 bg-card border border-border rounded-lg shadow-soft-lg z-[1100] animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-heading font-semibold text-foreground">{title}</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePanel}
                className="w-6 h-6"
              >
                <Icon name="X" size={16} />
              </Button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Format Selection */}
              <div>
                <Select
                  label="Formato de Exportação"
                  options={formatOptions?.map(format => ({
                    value: format?.value,
                    label: format?.label,
                  }))}
                  value={selectedFormat}
                  onChange={setSelectedFormat}
                />
              </div>

              {/* Format Preview */}
              <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                <Icon 
                  name={getFormatIcon(selectedFormat)} 
                  size={20} 
                  className="text-muted-foreground" 
                />
                <div className="flex-1">
                  <p className="text-sm font-body font-medium text-foreground">
                    {formatOptions?.find(f => f?.value === selectedFormat)?.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedFormat === 'pdf' && 'Relatório formatado com gráficos e tabelas'}
                    {selectedFormat === 'excel' && 'Planilha com múltiplas abas e fórmulas'}
                    {selectedFormat === 'csv' && 'Dados brutos em formato separado por vírgulas'}
                    {selectedFormat === 'png' && 'Imagem em alta resolução da visão atual'}
                    {selectedFormat === 'json' && 'Dados estruturados em formato JSON'}
                  </p>
                </div>
              </div>

              {/* Export Options */}
              <div className="space-y-3">
                <h4 className="text-sm font-body font-medium text-foreground">Opções de Exportação</h4>
                
                {/* Date Range Info */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Período:</span>
                  <span className="text-foreground font-medium">Filtro atual</span>
                </div>

                {/* Data Scope */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Escopo de Dados:</span>
                  <span className="text-foreground font-medium">Dados visíveis</span>
                </div>

                {/* File Size Estimate */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tam. Est.:</span>
                  <span className="text-foreground font-medium">
                    {selectedFormat === 'pdf' && '~2.5 MB'}
                    {selectedFormat === 'excel' && '~1.8 MB'}
                    {selectedFormat === 'csv' && '~450 KB'}
                    {selectedFormat === 'png' && '~1.2 MB'}
                    {selectedFormat === 'json' && '~320 KB'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2 pt-2">
                <Button
                  variant="outline"
                  onClick={togglePanel}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  variant="default"
                  onClick={handleExport}
                  loading={isExporting}
                  iconName={isExporting ? undefined : 'Download'}
                  iconPosition="left"
                  className="flex-1"
                >
                  {isExporting ? 'Exportando...' : 'Exportar'}
                </Button>
              </div>
            </div>

            {/* Quick Export Actions */}
            <div className="border-t border-border p-4">
              <p className="text-xs text-muted-foreground mb-3">Exportação Rápida:</p>
              <div className="flex space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedFormat('pdf');
                    handleExport();
                  }}
                  iconName="FileText"
                  iconPosition="left"
                  className="flex-1"
                >
                  PDF
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedFormat('excel');
                    handleExport();
                  }}
                  iconName="FileSpreadsheet"
                  iconPosition="left"
                  className="flex-1"
                >
                  Excel
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedFormat('csv');
                    handleExport();
                  }}
                  iconName="Database"
                  iconPosition="left"
                  className="flex-1"
                >
                  CSV
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ExportControlPanel;