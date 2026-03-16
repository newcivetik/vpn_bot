import { useEffect, useState } from 'react';
import { Header } from '../components/Header.tsx';
import { adminApi } from '../api/client.ts';
import type { Setting } from '../api/types.ts';
import { Save, Loader2, CheckCircle } from 'lucide-react';

export function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getSettings();
      setSettings(data);
      const values: Record<string, string> = {};
      for (const s of data) {
        values[s.key] = s.value;
      }
      setEditedValues(values);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setEditedValues((prev) => ({ ...prev, [key]: value }));
    setSaved((prev) => ({ ...prev, [key]: false }));
  };

  const handleSave = async (key: string) => {
    setSaving((prev) => ({ ...prev, [key]: true }));
    try {
      await adminApi.updateSetting(key, editedValues[key]);
      setSaved((prev) => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setSaved((prev) => ({ ...prev, [key]: false }));
      }, 2000);
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }));
    }
  };

  const isChanged = (setting: Setting) => {
    return editedValues[setting.key] !== setting.value;
  };

  if (loading) {
    return (
      <>
        <Header title="Настройки" />
        <div className="p-6 flex items-center justify-center">
          <Loader2 className="animate-spin text-slate-400" size={32} />
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Настройки" />
      <div className="p-6 space-y-6 max-w-2xl">
        <p className="text-sm text-slate-500">
          Настройки применяются сразу, без перезапуска сервера.
        </p>

        <div className="space-y-4">
          {settings.map((setting) => (
            <div
              key={setting.key}
              className="bg-white border border-slate-200 rounded-lg p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {setting.key}
                  </label>
                  {setting.description && (
                    <p className="text-xs text-slate-400 mb-2">
                      {setting.description}
                    </p>
                  )}
                  <input
                    type="number"
                    value={editedValues[setting.key] ?? setting.value}
                    onChange={(e) => handleChange(setting.key, e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min={0}
                  />
                </div>
                <div className="pt-6">
                  {saved[setting.key] ? (
                    <div className="flex items-center gap-1 text-green-600 text-sm">
                      <CheckCircle size={16} />
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSave(setting.key)}
                      disabled={!isChanged(setting) || saving[setting.key]}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving[setting.key] ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Save size={14} />
                      )}
                      Сохранить
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {settings.length === 0 && (
          <div className="text-center text-slate-400 py-12">
            Настройки не найдены
          </div>
        )}
      </div>
    </>
  );
}
