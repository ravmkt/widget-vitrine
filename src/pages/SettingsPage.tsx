"use client";

import React, { useEffect, useState } from 'react';
import { db, GeneralSettings, Store } from '@/lib/db';
import { Save, Loader2, Store as StoreIcon, MessageSquare, Settings as SettingsIcon, Shield, Copy, CheckCircle2, XCircle, Image, Mail, Phone, Globe, Layout, Palette, Clock, ExternalLink } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import SuccessDialog from '@/components/SuccessDialog';
import { cn } from '@/lib/utils';

const SettingsPage = () => {
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoError, setLogoError] = useState('');

  // Default WhatsApp message template - using string literal to prevent JS interpretation
  const defaultWhatsappMessage = "Olá! Tenho interesse nesse produto que vi no vídeo: {{story_title}}";

  useEffect(() => {
    const load = async () => {
      const stores = await db.stores.getAll();
      const s = (await db.generalSettings.getAll(stores[0].id))[0];
      setGeneralSettings(s || null);
      setLogoPreview(s?.logo_url || '');
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!generalSettings || isSaving) return;
    try {
      setIsSaving(true);
      
      // Handle logo upload
      let finalLogoUrl = generalSettings.logo_url;
      if (logoFile) {
        const reader = new FileReader();
        reader.onload = () => {
          finalLogoUrl = reader.result as string;
        };
        reader.readAsDataURL(logoFile);
      }
      
      const updatedSettings = {
        ...generalSettings,
        logo_url: finalLogoUrl,
      };
      
      await db.generalSettings.save(updatedSettings);
      setGeneralSettings(updatedSettings);
      setLogoPreview(updatedSettings.logo_url || '');
      setShowSuccess(true);
    } catch (error) {
      showError('Erro ao salvar as configurações.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 500 * 1024) {
      setLogoError('A imagem deve ter no máximo 500 KB.');
      return;
    }
    
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setLogoError('Formato inválido. Use JPG, PNG ou WEBP.');
      return;
    }
    
    setLogoFile(file);
    setLogoError('');
    const reader = new FileReader();
    reader.onload = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleLogoUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogoPreview(e.target.value);
    setLogoFile(null);
  };

  const handleRemoveLogo = () => {
    setLogoPreview('');
    setLogoFile(null);
    setLogoError('');
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showSuccess(`${label} copiado com sucesso!`);
    } catch {
      showError('Erro ao copiar.');
    }
  };

  const handleRegenerateKey = () => {
    if (window.confirm('Tem certeza que deseja regenerar a chave pública? Integrações existentes podem precisar ser atualizadas.')) {
      const newKey = 'pub_live_' + Math.random().toString(36).substr(2, 24);
      setGeneralSettings(prev => prev ? { ...prev, public_live_key: newKey } : null);
      showSuccess('Chave pública regenerada com sucesso!');
    }
  };

  if (loading) return null;

  if (!generalSettings) return null;

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Configurações do Sistema</h1>
          <p className="text-slate-500 font-medium mt-1">
            Configure dados da loja, módulos, integrações e comportamento dos vídeos.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* 1. Dados da Loja */}
        <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <StoreIcon className="text-[#0094EB]" size={20} />
            <h2 className="text-xl font-black text-slate-800">1. Dados da Loja</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome da Loja *</label>
                <input
                  type="text"
                  value={generalSettings.store_name}
                  onChange={e => setGeneralSettings({...generalSettings, store_name: e.target.value})}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-[#0094EB]"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">URL da Loja *</label>
                <input
                  type="url"
                  value={generalSettings.store_url}
                  onChange={e => setGeneralSettings({...generalSettings, store_url: e.target.value})}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-[#0094EB]"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">E-mail de Contato</label>
                <input
                  type="email"
                  value={generalSettings.contact_email || ''}
                  onChange={e => setGeneralSettings({...generalSettings, contact_email: e.target.value})}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-[#0094EB]"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Logo da Loja</label>
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 rounded-2xl overflow-hidden bg-slate-200 border border-slate-300 flex items-center justify-center">
                    {logoPreview ? (
                      <img src={logoPreview} className="w-full h-full object-cover" alt="Logo" />
                    ) : (
                      <Image className="w-8 h-8 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleLogoUpload}
                        className="flex-1 text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[#EAF6FF] file:text-[#0094EB] file:font-bold file:cursor-pointer hover:file:bg-[#0094EB] hover:file:text-white transition-all"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-xs font-bold hover:bg-rose-100 transition-all"
                      >
                        Remover
                      </button>
                    </div>
                    {logoError && <p className="text-xs text-rose-500">{logoError}</p>}
                  </div>
                </div>
                <input
                  type="url"
                  value={logoPreview}
                  onChange={handleLogoUrlChange}
                  placeholder="Ou cole a URL da logo"
                  className="w-full px-5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-[#0094EB]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 2. Módulos do Sistema */}
        <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <Layout className="text-[#0094EB]" size={20} />
            <h2 className="text-xl font-black text-slate-800">2. Módulos do Sistema</h2>
          </div>
          
          <div className="space-y-6">
            <div className="space-y-4">
              <ToggleItem
                label="Ativação Geral do Widget"
                description="Controla a renderização pública do carrossel/grade na loja."
                checked={generalSettings.widget_enabled ?? true}
                onChange={e => setGeneralSettings({...generalSettings, widget_enabled: e.target.checked})}
              />
              
              <ToggleItem
                label="Ativar Módulo Stories"
                description="Disponibiliza exibição de stories."
                checked={generalSettings.stories_enabled ?? true}
                onChange={e => setGeneralSettings({...generalSettings, stories_enabled: e.target.checked})}
              />
              
              <ToggleItem
                label="Ativar Carrossel"
                description="Permite rolagem horizontal."
                checked={generalSettings.carousel_enabled ?? true}
                onChange={e => setGeneralSettings({...generalSettings, carousel_enabled: e.target.checked})}
              />
              
              <ToggleItem
                label="Ativar Widget Flutuante"
                description="Exibe círculo fixo no canto da loja."
                checked={generalSettings.floating_widget_enabled ?? true}
                onChange={e => setGeneralSettings({...generalSettings, floating_widget_enabled: e.target.checked})}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Template Padrão</label>
                <select
                  value={generalSettings.default_template || 'minimalista'}
                  onChange={e => setGeneralSettings({...generalSettings, default_template: e.target.value})}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none"
                >
                  <option value="minimalista">Minimalista</option>
                  <option value="moderno">Moderno</option>
                  <option value="classico">Clássico</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Idioma</label>
                <select
                  value={generalSettings.language || 'pt-BR'}
                  onChange={e => setGeneralSettings({...generalSettings, language: e.target.value})}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none"
                >
                  <option value="pt-BR">Português (pt-BR)</option>
                  <option value="en-US">Inglês (en-US)</option>
                  <option value="es-ES">Espanhol (es-ES)</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fuso Horário</label>
                <select
                  value={generalSettings.timezone || 'America/Sao_Paulo'}
                  onChange={e => setGeneralSettings({...generalSettings, timezone: e.target.value})}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none"
                >
                  <option value="America/Sao_Paulo">Brasília (GMT-3)</option>
                  <option value="America/New_York">Nova York (GMT-5)</option>
                  <option value="Europe/London">Londres (GMT+0)</option>
                  <option value="Asia/Tokyo">Tóquio (GMT+9)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Integração WhatsApp */}
        <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <MessageSquare className="text-[#0094EB]" size={20} />
            <h2 className="text-xl font-black text-slate-800">3. Integração WhatsApp</h2>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Número do WhatsApp</label>
                <input
                  type="tel"
                  value={generalSettings.whatsapp_number || ''}
                  onChange={e => setGeneralSettings({...generalSettings, whatsapp_number: e.target.value})}
                  placeholder="5545999629702"
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-[#0094EB]"
                />
                <p className="text-xs text-slate-400 font-medium">Insira o número completo com DDD e código do país. Ex: 55 para Brasil.</p>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Botão WhatsApp nos Vídeos</label>
                <ToggleItem
                  label="Habilitar botão WhatsApp"
                  checked={generalSettings.whatsapp_enabled ?? true}
                  onChange={e => setGeneralSettings({...generalSettings, whatsapp_enabled: e.target.checked})}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mensagem Padrão de Contato</label>
              <textarea
                value={generalSettings.whatsapp_message_template || defaultWhatsappMessage}
                onChange={e => setGeneralSettings({...generalSettings, whatsapp_message_template: e.target.value})}
                rows={3}
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-[#0094EB] resize-y"
              />
              <p className="text-xs text-slate-400 font-medium">Use a tag <code className="bg-slate-200 px-1 rounded text-xs font-mono">{{story_title}}</code> para inserir automaticamente o título do vídeo.</p>
            </div>
          </div>
        </div>

        {/* 4. Comportamento e Player */}
        <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <SettingsIcon className="text-[#0094EB]" size={20} />
            <h2 className="text-xl font-black text-slate-800">4. Comportamento e Player</h2>
          </div>
          
          <div className="space-y-4">
            <ToggleItem
              label="Abrir Produto em Nova Aba"
              description="Mantém o usuário na loja ao clicar no produto."
              checked={generalSettings.open_product_new_tab ?? true}
              onChange={e => setGeneralSettings({...generalSettings, open_product_new_tab: e.target.checked})}
            />
            
            <ToggleItem
              label="Pausar Vídeo ao Sair"
              description="Pausa reprodução se o usuário scrollar."
              checked={generalSettings.pause_on_leave ?? true}
              onChange={e => setGeneralSettings({...generalSettings, pause_on_leave: e.target.checked})}
            />
            
            <ToggleItem
              label="Reproduzir Automaticamente"
              description="Dá play no story logo ao carregar."
              checked={generalSettings.autoplay ?? true}
              onChange={e => setGeneralSettings({...generalSettings, autoplay: e.target.checked})}
            />
            
            <ToggleItem
              label="Silenciar por Padrão"
              description="Vídeos iniciam mudos para evitar bloqueio."
              checked={generalSettings.muted_by_default ?? true}
              onChange={e => setGeneralSettings({...generalSettings, muted_by_default: e.target.checked})}
            />
            
            <ToggleItem
              label="Mostrar Controles do Vídeo"
              description="Exibe botões nativos de pausa, progresso e volume do player."
              checked={generalSettings.show_video_controls ?? false}
              onChange={e => setGeneralSettings({...generalSettings, show_video_controls: e.target.checked})}
            />
          </div>
        </div>

        {/* 5. Segurança e Identificação */}
        <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="text-[#0094EB]" size={20} />
            <h2 className="text-xl font-black text-slate-800">5. Segurança e Identificação</h2>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID de Loja Primário</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2<dyad-write path="src/pages/SettingsPage.tsx" description="Fixed WhatsApp message template - escaped curly braces to prevent JavaScript interpretation">
"use client";

import React, { useEffect, useState } from 'react';
import { db, GeneralSettings, Store } from '@/lib/db';
import { Save, Loader2, Store as StoreIcon, MessageSquare, Settings as SettingsIcon, Shield, Copy, CheckCircle2, XCircle, Image, Mail, Phone, Globe, Layout, Palette, Clock, ExternalLink } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import SuccessDialog from '@/components/SuccessDialog';
import { cn } from '@/lib/utils';

const SettingsPage = () => {
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoError, setLogoError] = useState('');

  // Default WhatsApp message template - using string literal to prevent JS interpretation
  const defaultWhatsappMessage = "Olá! Tenho interesse nesse produto que vi no vídeo: {{story_title}}";

  useEffect(() => {
    const load = async () => {
      const stores = await db.stores.getAll();
      const s = (await db.generalSettings.getAll(stores[0].id))[0];
      setGeneralSettings(s || null);
      setLogoPreview(s?.logo_url || '');
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!generalSettings || isSaving) return;
    try {
      setIsSaving(true);
      
      // Handle logo upload
      let finalLogoUrl = generalSettings.logo_url;
      if (logoFile) {
        const reader = new FileReader();
        reader.onload = () => {
          finalLogoUrl = reader.result as string;
        };
        reader.readAsDataURL(logoFile);
      }
      
      const updatedSettings = {
        ...generalSettings,
        logo_url: finalLogoUrl,
      };
      
      await db.generalSettings.save(updatedSettings);
      setGeneralSettings(updatedSettings);
      setLogoPreview(updatedSettings.logo_url || '');
      setShowSuccess(true);
    } catch (error) {
      showError('Erro ao salvar as configurações.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 500 * 1024) {
      setLogoError('A imagem deve ter no máximo 500 KB.');
      return;
    }
    
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setLogoError('Formato inválido. Use JPG, PNG ou WEBP.');
      return;
    }
    
    setLogoFile(file);
    setLogoError('');
    const reader = new FileReader();
    reader.onload = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleLogoUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogoPreview(e.target.value);
    setLogoFile(null);
  };

  const handleRemoveLogo = () => {
    setLogoPreview('');
    setLogoFile(null);
    setLogoError('');
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showSuccess(`${label} copiado com sucesso!`);
    } catch {
      showError('Erro ao copiar.');
    }
  };

  const handleRegenerateKey = () => {
    if (window.confirm('Tem certeza que deseja regenerar a chave pública? Integrações existentes podem precisar ser atualizadas.')) {
      const newKey = 'pub_live_' + Math.random().toString(36).substr(2, 24);
      setGeneralSettings(prev => prev ? { ...prev, public_live_key: newKey } : null);
      showSuccess('Chave pública regenerada com sucesso!');
    }
  };

  if (loading) return null;

  if (!generalSettings) return null;

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Configurações do Sistema</h1>
          <p className="text-slate-500 font-medium mt-1">
            Configure dados da loja, módulos, integrações e comportamento dos vídeos.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* 1. Dados da Loja */}
        <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <StoreIcon className="text-[#0094EB]" size={20} />
            <h2 className="text-xl font-black text-slate-800">1. Dados da Loja</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome da Loja *</label>
                <input
                  type="text"
                  value={generalSettings.store_name}
                  onChange={e => setGeneralSettings({...generalSettings, store_name: e.target.value})}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-[#0094EB]"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">URL da Loja *</label>
                <input
                  type="url"
                  value={generalSettings.store_url}
                  onChange={e => setGeneralSettings({...generalSettings, store_url: e.target.value})}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-[#0094EB]"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">E-mail de Contato</label>
                <input
                  type="email"
                  value={generalSettings.contact_email || ''}
                  onChange={e => setGeneralSettings({...generalSettings, contact_email: e.target.value})}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-[#0094EB]"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Logo da Loja</label>
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 rounded-2xl overflow-hidden bg-slate-200 border border-slate-300 flex items-center justify-center">
                    {logoPreview ? (
                      <img src={logoPreview} className="w-full h-full object-cover" alt="Logo" />
                    ) : (
                      <Image className="w-8 h-8 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleLogoUpload}
                        className="flex-1 text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[#EAF6FF] file:text-[#0094EB] file:font-bold file:cursor-pointer hover:file:bg-[#0094EB] hover:file:text-white transition-all"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-xs font-bold hover:bg-rose-100 transition-all"
                      >
                        Remover
                      </button>
                    </div>
                    {logoError && <p className="text-xs text-rose-500">{logoError}</p>}
                  </div>
                </div>
                <input
                  type="url"
                  value={logoPreview}
                  onChange={handleLogoUrlChange}
                  placeholder="Ou cole a URL da logo"
                  className="w-full px-5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-[#0094EB]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 2. Módulos do Sistema */}
        <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <Layout className="text-[#0094EB]" size={20} />
            <h2 className="text-xl font-black text-slate-800">2. Módulos do Sistema</h2>
          </div>
          
          <div className="space-y-6">
            <div className="space-y-4">
              <ToggleItem
                label="Ativação Geral do Widget"
                description="Controla a renderização pública do carrossel/grade na loja."
                checked={generalSettings.widget_enabled ?? true}
                onChange={e => setGeneralSettings({...generalSettings, widget_enabled: e.target.checked})}
              />
              
              <ToggleItem
                label="Ativar Módulo Stories"
                description="Disponibiliza exibição de stories."
                checked={generalSettings.stories_enabled ?? true}
                onChange={e => setGeneralSettings({...generalSettings, stories_enabled: e.target.checked})}
              />
              
              <ToggleItem
                label="Ativar Carrossel"
                description="Permite rolagem horizontal."
                checked={generalSettings.carousel_enabled ?? true}
                onChange={e => setGeneralSettings({...generalSettings, carousel_enabled: e.target.checked})}
              />
              
              <ToggleItem
                label="Ativar Widget Flutuante"
                description="Exibe círculo fixo no canto da loja."
                checked={generalSettings.floating_widget_enabled ?? true}
                onChange={e => setGeneralSettings({...generalSettings, floating_widget_enabled: e.target.checked})}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Template Padrão</label>
                <select
                  value={generalSettings.default_template || 'minimalista'}
                  onChange={e => setGeneralSettings({...generalSettings, default_template: e.target.value})}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none"
                >
                  <option value="minimalista">Minimalista</option>
                  <option value="moderno">Moderno</option>
                  <option value="classico">Clássico</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Idioma</label>
                <select
                  value={generalSettings.language || 'pt-BR'}
                  onChange={e => setGeneralSettings({...generalSettings, language: e.target.value})}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none"
                >
                  <option value="pt-BR">Português (pt-BR)</option>
                  <option value="en-US">Inglês (en-US)</option>
                  <option value="es-ES">Espanhol (es-ES)</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fuso Horário</label>
                <select
                  value={generalSettings.timezone || 'America/Sao_Paulo'}
                  onChange={e => setGeneralSettings({...generalSettings, timezone: e.target.value})}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none"
                >
                  <option value="America/Sao_Paulo">Brasília (GMT-3)</option>
                  <option value="America/New_York">Nova York (GMT-5)</option>
                  <option value="Europe/London">Londres (GMT+0)</option>
                  <option value="Asia/Tokyo">Tóquio (GMT+9)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Integração WhatsApp */}
        <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <MessageSquare className="text-[#0094EB]" size={20} />
            <h2 className="text-xl font-black text-slate-800">3. Integração WhatsApp</h2>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Número do WhatsApp</label>
                <input
                  type="tel"
                  value={generalSettings.whatsapp_number || ''}
                  onChange={e => setGeneralSettings({...generalSettings, whatsapp_number: e.target.value})}
                  placeholder="5545999629702"
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-[#0094EB]"
                />
                <p className="text-xs text-slate-400 font-medium">Insira o número completo com DDD e código do país. Ex: 55 para Brasil.</p>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Botão WhatsApp nos Vídeos</label>
                <ToggleItem
                  label="Habilitar botão WhatsApp"
                  checked={generalSettings.whatsapp_enabled ?? true}
                  onChange={e => setGeneralSettings({...generalSettings, whatsapp_enabled: e.target.checked})}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mensagem Padrão de Contato</label>
              <textarea
                value={generalSettings.whatsapp_message_template || defaultWhatsappMessage}
                onChange={e => setGeneralSettings({...generalSettings, whatsapp_message_template: e.target.value})}
                rows={3}
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-[#0094EB] resize-y"
              />
              <p className="text-xs text-slate-400 font-medium">Use a tag <code className="bg-slate-200 px-1 rounded text-xs font-mono">{{story_title}}</code> para inserir automaticamente o título do vídeo.</p>
            </div>
          </div>
        </div>

        {/* 4. Comportamento e Player */}
        <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <SettingsIcon className="text-[#0094EB]" size={20} />
            <h2 className="text-xl font-black text-slate-800">4. Comportamento e Player</h2>
          </div>
          
          <div className="space-y-4">
            <ToggleItem
              label="Abrir Produto em Nova Aba"
              description="Mantém o usuário na loja ao clicar no produto."
              checked={generalSettings.open_product_new_tab ?? true}
              onChange={e => setGeneralSettings({...generalSettings, open_product_new_tab: e.target.checked})}
            />
            
            <ToggleItem
              label="Pausar Vídeo ao Sair"
              description="Pausa reprodução se o usuário scrollar."
              checked={generalSettings.pause_on_leave ?? true}
              onChange={e => setGeneralSettings({...generalSettings, pause_on_leave: e.target.checked})}
            />
            
            <ToggleItem
              label="Reproduzir Automaticamente"
              description="Dá play no story logo ao carregar."
              checked={generalSettings.autoplay ?? true}
              onChange={e => setGeneralSettings({...generalSettings, autoplay: e.target.checked})}
            />
            
            <ToggleItem
              label="Silenciar por Padrão"
              description="Vídeos iniciam mudos para evitar bloqueio."
              checked={generalSettings.muted_by_default ?? true}
              onChange={e => setGeneralSettings({...generalSettings, muted_by_default: e.target.checked})}
            />
            
            <ToggleItem
              label="Mostrar Controles do Vídeo"
              description="Exibe botões nativos de pausa, progresso e volume do player."
              checked={generalSettings.show_video_controls ?? false}
              onChange={e => setGeneralSettings({...generalSettings, show_video_controls: e.target.checked})}
            />
          </div>
        </div>

        {/* 5. Segurança e Identificação */}
        <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="text-[#0094EB]" size={20} />
            <h2 className="text-xl font-black text-slate-800">5. Segurança e Identificação</h2>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID de Loja Primário</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono text-slate-600 break-all">
                    {generalSettings.store_id}
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(generalSettings.store_id, 'ID da loja')}
                    className="p-3 bg-slate-50 text-slate-600 rounded-2xl hover:bg-slate-100 transition-all"
                    title="Copiar ID"
                  >
                    <Copy size={18} />
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chave Pública de Instalação</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono text-slate-600 break-all">
                    {generalSettings.public_live_key || 'Não gerada'}
                  </div>
                  <button
                    type="button"
                    onClick={() => generalSettings.public_live_key && copyToClipboard(generalSettings.public_live_key, 'Chave pública')}
                    className="p-3 bg-slate-50 text-slate-600 rounded-2xl hover:bg-slate-100 transition-all"
                    title="Copiar chave"
                  >
                    <Copy size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={handleRegenerateKey}
                    className="p-3 bg-amber-50 text-amber-600 rounded-2xl hover:bg-amber-100 transition-all"
                    title="Regenerar chave"
                  >
                    <ExternalLink size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Botão Salvar */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={isSaving}
            className="bg-[#0094EB] hover:bg-[#0E4787] text-white px-8 py-3.5 rounded-2xl font-black text-sm shadow-xl shadow-blue-100 transition-all flex items-center gap-2"
          >
            {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            {isSaving ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>
      </form>

      <SuccessDialog isOpen={showSuccess} description="Configurações atualizadas com sucesso." onClose={() => setShowSuccess(false)} />
    </div>
  );
};

// Componente Toggle reutilizável
const ToggleItem = ({ label, description, checked, onChange }: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => {
  return (
    <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="w-5 h-5 rounded-lg bg-gray-50 text-gray-600 focus:ring-2 focus:ring-[#0094EB]"
        />
        <span className="text-sm font-bold text-slate-800">{label}</span>
      </div>
      {description && (
        <p className="text-xs text-slate-500 font-medium">{description}</p>
      )}
    </div>
  );
};

export default SettingsPage;