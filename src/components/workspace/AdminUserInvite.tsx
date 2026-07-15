'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/apiClient';
import { useAuthStore } from '@/store/authStore';
import { useTranslationStore } from '@/store/translationStore';
import { useTranslation } from '@/lib/localization';
import { Mail, Copy, CheckCircle2 } from 'lucide-react';

export default function AdminUserInvite() {
  const { currentUser } = useAuthStore();
  const { settings } = useTranslationStore();
  const t = useTranslation(settings?.uiLanguage || 'ko');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('WORKER');
  const [loading, setLoading] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (currentUser?.role !== 'SUPER_ADMIN' && currentUser?.role !== 'SYSTEM_ADMIN') {
    return null;
  }

  const handleInvite = async () => {
    try {
      setLoading(true);
      setError(null);
      setGeneratedToken(null);
      
      const res = await apiClient('/auth/invite', {
        method: 'POST',
        body: JSON.stringify({ email, role })
      });
      
      setGeneratedToken(res.token);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('workspace.invite.errorFailed'));
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (generatedToken) {
      navigator.clipboard.writeText(generatedToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-lg border-blue-500/20">
      <CardHeader className="bg-slate-50 dark:bg-slate-900 border-b">
        <CardTitle className="text-lg font-semibold flex items-center gap-2 text-slate-800 dark:text-slate-100">
          <Mail className="w-5 h-5 text-blue-500" />
          {t('workspace.invite.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('workspace.invite.emailLabel')}</label>
          <Input
            type="email"
            placeholder={t('workspace.invite.emailPlaceholder')}
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('workspace.invite.roleLabel')}</label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger>
              <SelectValue placeholder={t('workspace.invite.rolePlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="WORKER">{t('workspace.invite.roleWorker')}</SelectItem>
              <SelectItem value="PM">{t('workspace.invite.rolePM')}</SelectItem>
              <SelectItem value="DEPARTMENT_MANAGER">{t('workspace.invite.roleDeptManager')}</SelectItem>
              <SelectItem value="SYSTEM_ADMIN">{t('workspace.invite.roleSysAdmin')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-md">
            {error}
          </div>
        )}

        {generatedToken ? (
          <div className="p-4 bg-green-50 border border-green-200 rounded-md space-y-3">
            <p className="text-sm font-medium text-green-800">
              {t('workspace.invite.successMsg')}
            </p>
            <div className="flex items-center gap-2 p-2 bg-white border border-green-100 rounded text-xs font-mono break-all text-slate-600">
              {generatedToken}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full text-green-700 border-green-200 hover:bg-green-100"
              onClick={copyToClipboard}
            >
              {copied ? (
                <><CheckCircle2 className="w-4 h-4 mr-2" /> {t('workspace.invite.copied')}</>
              ) : (
                <><Copy className="w-4 h-4 mr-2" /> {t('workspace.invite.copyToken')}</>
              )}
            </Button>
            <p className="text-xs text-green-600 mt-2 text-center">
              {t('workspace.invite.copyTokenDesc')}
            </p>
          </div>
        ) : (
          <Button 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white" 
            onClick={handleInvite}
            disabled={loading || !email}
          >
            {loading ? t('workspace.invite.btnGenerating') : t('workspace.invite.btnGenerate')}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
