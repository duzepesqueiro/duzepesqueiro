import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import Header from '../../components/ui/Header';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import QuickActions from '../../components/ui/QuickActions';
import { exportLogCollection, listLogCollections } from '../../services/logsDataService';

const DataManagementDashboard = () => {
  const [collections, setCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState('');
  const [format, setFormat] = useState('json');
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await listLogCollections();
        if (mounted) {
          setCollections(Array.isArray(data) ? data : []);
          if (!selectedCollection && Array.isArray(data) && data.length) {
            setSelectedCollection(String(data[0]));
          }
        }
      } catch (err) {
        if (mounted) {
          const message = err?.response?.data?.message || 'Não foi possível carregar as coleções de logs.';
          setError(Array.isArray(message) ? message.join(' ') : String(message));
          setCollections([]);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const collectionOptions = useMemo(
    () => (collections || []).map((c) => ({ label: String(c), value: String(c) })),
    [collections],
  );

  const formatOptions = useMemo(
    () => [
      { label: 'JSON', value: 'json' },
      { label: 'CSV', value: 'csv' },
    ],
    [],
  );

  const canExport = Boolean(selectedCollection && format && !isLoading && !isExporting);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Dados | Administração</title>
        <meta name="description" content="Exportação de logs armazenados no MongoDB." />
      </Helmet>

      <Header />

      <div className="pt-16 pb-8">
        <div className="max-w mx-auto px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">Dados</h1>
              <p className="text-muted-foreground">Exporte os logs armazenados no MongoDB por coleção.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                iconName="RefreshCw"
                loading={isLoading}
                onClick={async () => {
                  try {
                    setIsLoading(true);
                    setError(null);
                    const data = await listLogCollections();
                    setCollections(Array.isArray(data) ? data : []);
                    if (!selectedCollection && Array.isArray(data) && data.length) {
                      setSelectedCollection(String(data[0]));
                    }
                  } catch (err) {
                    const message = err?.response?.data?.message || 'Não foi possível carregar as coleções de logs.';
                    setError(Array.isArray(message) ? message.join(' ') : String(message));
                    setCollections([]);
                  } finally {
                    setIsLoading(false);
                  }
                }}
              >
                Atualizar
              </Button>
            </div>
          </div>

          {error ? (
            <div className="mb-6 rounded-lg border border-border bg-card p-4 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <div className="bg-card border border-border rounded-lg p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Select
                label="Seleção de Coleção"
                placeholder={isLoading ? 'Carregando...' : 'Selecione uma coleção'}
                value={selectedCollection}
                options={collectionOptions}
                searchable
                loading={isLoading}
                onChange={(v) => setSelectedCollection(String(v))}
              />

              <Select
                label="Formato"
                value={format}
                options={formatOptions}
                onChange={(v) => setFormat(String(v))}
              />

              <div className="flex items-end">
                <Button
                  className="w-full"
                  size="lg"
                  variant="secondary"
                  iconName="Download"
                  loading={isExporting}
                  disabled={!canExport}
                  onClick={async () => {
                    try {
                      setIsExporting(true);
                      setError(null);
                      await exportLogCollection({ collection: selectedCollection, format });
                    } catch (err) {
                      const message = err?.response?.data?.message || 'Não foi possível exportar a coleção.';
                      setError(Array.isArray(message) ? message.join(' ') : String(message));
                    } finally {
                      setIsExporting(false);
                    }
                  }}
                >
                  Exportar
                </Button>
              </div>
            </div>

            <div className="mt-4 text-xs text-muted-foreground">
              A exportação buscará todos os documentos da coleção selecionada.
            </div>
          </div>

          <QuickActions className="mt-6" />
        </div>
      </div>
    </div>
  );
};

export default DataManagementDashboard;
