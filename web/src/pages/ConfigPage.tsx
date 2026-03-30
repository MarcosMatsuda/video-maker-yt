import { useState, useEffect } from 'react';
import type { Config } from '../types';
import { configApi } from '../lib/api';
import { useToast } from '../components/layout/Toast';

export function ConfigPage() {
  const toast = useToast();
  const [config, setConfig] = useState<Config | null>(null);

  useEffect(() => {
    configApi.get().then(setConfig);
  }, []);

  if (!config) return <div className="text-center py-20 text-muted">Carregando...</div>;

  const handleSave = async () => {
    await configApi.save(config);
    toast('Configurações salvas!');
  };

  const field = (label: string, key: keyof Config, type: string = 'text') => (
    <div>
      <label className="flex items-center gap-2 text-xs text-muted mb-1">
        <span>{label}</span>
        {config[key] && <span className="w-1.5 h-1.5 rounded-full bg-green" />}
      </label>
      <input
        type={type}
        value={config[key]}
        onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
        className="w-full px-3 py-2 bg-surface-3 border border-border-2 rounded-lg text-sm text-text placeholder:text-muted/50 focus:outline-none focus:border-accent/50"
      />
    </div>
  );

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-text mb-6">Configurações</h1>

      <div className="space-y-6">
        <div className="bg-surface-2 border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-text">API Keys</h2>
          {field('HeyGen API Key', 'heygen_api_key', 'password')}
          {field('HeyGen Avatar ID', 'heygen_avatar_id')}
          {field('OpenAI API Key (DALL-E)', 'openai_api_key', 'password')}
        </div>

        <div className="bg-surface-2 border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-text">Canal</h2>
          {field('Nome do canal', 'canal_nome')}
          {field('CTA (call to action)', 'canal_cta')}
        </div>

        <button onClick={handleSave} className="px-5 py-2 bg-accent text-bg rounded-lg text-sm font-semibold hover:brightness-110 transition">
          Salvar configurações
        </button>
      </div>
    </div>
  );
}
