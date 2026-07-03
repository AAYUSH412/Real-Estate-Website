import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cpu, Plus, Pencil, Trash2, Star, ToggleLeft, ToggleRight,
  RefreshCw, AlertCircle, Check, X, ChevronDown, ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../services/apiClient';
import { cn } from '../lib/utils';

const EMPTY_FORM = {
  name: '',
  slug: '',
  modelId: '',
  badge: '',
  description: '',
  isActive: true,
  isDefault: false,
  order: 0,
  config: {
    maxTokens: 6000,
    timeoutMs: 90000,
    temperature: 0.3,
    topP: 1,
    enableThinking: false,
    reasoningBudget: null,
  },
};

const AIModels = () => {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [expandedConfig, setExpandedConfig] = useState(null);

  const fetchModels = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await apiClient.get('/api/admin/ai-models');
      setModels(data.models || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load AI models');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchModels(); }, [fetchModels]);

  function openCreate() {
    setForm({ ...EMPTY_FORM, config: { ...EMPTY_FORM.config } });
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(model) {
    setForm({
      name: model.name,
      slug: model.slug,
      modelId: model.modelId,
      badge: model.badge || '',
      description: model.description || '',
      isActive: model.isActive,
      isDefault: model.isDefault,
      order: model.order,
      config: { ...EMPTY_FORM.config, ...model.config },
    });
    setEditingId(model._id);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function setField(path, value) {
    setForm(prev => {
      const next = { ...prev };
      if (path.startsWith('config.')) {
        const key = path.slice(7);
        next.config = { ...prev.config, [key]: value };
      } else {
        next[path] = value;
      }
      return next;
    });
  }

  async function handleSave() {
    if (!form.name || !form.slug || !form.modelId) {
      toast.error('Name, slug, and model ID are required');
      return;
    }
    try {
      setSaving(true);
      if (editingId) {
        await apiClient.put(`/api/admin/ai-models/${editingId}`, form);
        toast.success('Model updated');
      } else {
        await apiClient.post('/api/admin/ai-models', form);
        toast.success('Model created');
      }
      closeForm();
      fetchModels();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    try {
      await apiClient.delete(`/api/admin/ai-models/${id}`);
      toast.success('Model deleted');
      setDeleteConfirm(null);
      fetchModels();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  }

  async function toggleActive(model) {
    try {
      await apiClient.put(`/api/admin/ai-models/${model._id}`, { isActive: !model.isActive });
      toast.success(model.isActive ? 'Model deactivated' : 'Model activated');
      fetchModels();
    } catch (err) {
      toast.error('Failed to update model');
    }
  }

  async function setDefault(model) {
    try {
      await apiClient.put(`/api/admin/ai-models/${model._id}`, { isDefault: true });
      toast.success(`${model.name} set as default`);
      fetchModels();
    } catch (err) {
      toast.error('Failed to update default');
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF8F4] p-6">
      {/* Header */}
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-[#D4755B] rounded-xl flex items-center justify-center">
              <Cpu className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#1C1B1A]">AI Models</h1>
              <p className="text-sm text-[#6B7280]">Manage NVIDIA NIM models available to users</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchModels}
              className="p-2 text-[#6B7280] hover:text-[#1C1B1A] hover:bg-white rounded-lg transition-colors"
            >
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 bg-[#D4755B] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#C05E44] transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Model
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Model Cards */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-white rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {models.map(model => (
              <div key={model._id} className="bg-white rounded-xl border border-[#E5E0D8] overflow-hidden">
                <div className="flex items-center gap-4 p-4">
                  {/* Status indicator */}
                  <div className={cn(
                    'h-2.5 w-2.5 rounded-full flex-shrink-0',
                    model.isActive ? 'bg-green-500' : 'bg-[#D1D5DB]'
                  )} />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-[#1C1B1A]">{model.name}</span>
                      {model.isDefault && (
                        <span className="inline-flex items-center gap-1 text-xs bg-[#D4755B]/10 text-[#D4755B] px-2 py-0.5 rounded-full font-medium">
                          <Star className="h-3 w-3" /> Default
                        </span>
                      )}
                      {model.badge && (
                        <span className="text-xs bg-[#F3F0EB] text-[#6B7280] px-2 py-0.5 rounded-full">
                          {model.badge}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#9CA3AF] font-mono mt-0.5 truncate">{model.modelId}</div>
                    {model.description && (
                      <div className="text-sm text-[#6B7280] mt-1">{model.description}</div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => setExpandedConfig(expandedConfig === model._id ? null : model._id)}
                      className="p-2 text-[#9CA3AF] hover:text-[#1C1B1A] hover:bg-[#F3F0EB] rounded-lg transition-colors"
                      title="Toggle config"
                    >
                      {expandedConfig === model._id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    {!model.isDefault && (
                      <button
                        onClick={() => setDefault(model)}
                        className="p-2 text-[#9CA3AF] hover:text-[#D4755B] hover:bg-[#D4755B]/10 rounded-lg transition-colors"
                        title="Set as default"
                      >
                        <Star className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => toggleActive(model)}
                      className={cn(
                        'p-2 rounded-lg transition-colors',
                        model.isActive
                          ? 'text-green-600 hover:bg-green-50'
                          : 'text-[#9CA3AF] hover:bg-[#F3F0EB]'
                      )}
                      title={model.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {model.isActive ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => openEdit(model)}
                      className="p-2 text-[#9CA3AF] hover:text-[#1C1B1A] hover:bg-[#F3F0EB] rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(model._id)}
                      className="p-2 text-[#9CA3AF] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Config expanded */}
                <AnimatePresence>
                  {expandedConfig === model._id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-[#E5E0D8] px-4 py-3 bg-[#FAF8F4] grid grid-cols-3 gap-3 text-xs">
                        {[
                          ['maxTokens', model.config?.maxTokens],
                          ['timeoutMs', model.config?.timeoutMs],
                          ['temperature', model.config?.temperature],
                          ['topP', model.config?.topP],
                          ['enableThinking', String(model.config?.enableThinking)],
                          ['reasoningBudget', model.config?.reasoningBudget ?? 'none'],
                        ].map(([k, v]) => (
                          <div key={k}>
                            <div className="text-[#9CA3AF] uppercase tracking-wide font-medium">{k}</div>
                            <div className="font-mono text-[#1C1B1A] mt-0.5">{String(v)}</div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Delete confirm */}
                <AnimatePresence>
                  {deleteConfirm === model._id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-red-100 bg-red-50 px-4 py-3 flex items-center justify-between">
                        <span className="text-sm text-red-700">Delete <strong>{model.name}</strong>? This cannot be undone.</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="flex items-center gap-1 text-sm text-[#6B7280] hover:text-[#1C1B1A] px-3 py-1.5 rounded-lg hover:bg-white transition-colors"
                          >
                            <X className="h-3.5 w-3.5" /> Cancel
                          </button>
                          <button
                            onClick={() => handleDelete(model._id)}
                            className="flex items-center gap-1 text-sm text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            <Check className="h-3.5 w-3.5" /> Delete
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
            {!models.length && !loading && (
              <div className="text-center py-16 text-[#9CA3AF]">
                <Cpu className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No AI models configured. Add one to get started.</p>
              </div>
            )}
          </div>
        )}

        {/* Create / Edit Form Modal */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={(e) => e.target === e.currentTarget && closeForm()}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between p-5 border-b border-[#E5E0D8]">
                  <h2 className="font-bold text-lg text-[#1C1B1A]">
                    {editingId ? 'Edit Model' : 'Add AI Model'}
                  </h2>
                  <button onClick={closeForm} className="p-1.5 text-[#9CA3AF] hover:text-[#1C1B1A] rounded-lg hover:bg-[#F3F0EB] transition-colors">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="p-5 space-y-4">
                  {/* Basic fields */}
                  {[
                    { label: 'Name', field: 'name', placeholder: 'Nemotron Nano' },
                    { label: 'Slug', field: 'slug', placeholder: 'nemotron-nano' },
                    { label: 'Model ID', field: 'modelId', placeholder: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning' },
                    { label: 'Badge', field: 'badge', placeholder: 'Fast · Reasoning' },
                    { label: 'Description', field: 'description', placeholder: 'Short description shown to users' },
                  ].map(({ label, field, placeholder }) => (
                    <div key={field}>
                      <label className="block text-sm font-semibold text-[#1C1B1A] mb-1">{label}</label>
                      <input
                        className="w-full border border-[#E5E0D8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4755B]/30 focus:border-[#D4755B]"
                        value={form[field]}
                        onChange={e => setField(field, e.target.value)}
                        placeholder={placeholder}
                      />
                    </div>
                  ))}

                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-semibold text-[#1C1B1A] mb-1">Order</label>
                      <input
                        type="number"
                        className="w-full border border-[#E5E0D8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4755B]/30 focus:border-[#D4755B]"
                        value={form.order}
                        onChange={e => setField('order', Number(e.target.value))}
                      />
                    </div>
                    <div className="flex-1 flex flex-col justify-end gap-2">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input type="checkbox" checked={form.isActive} onChange={e => setField('isActive', e.target.checked)} className="rounded" />
                        <span className="text-sm font-semibold text-[#1C1B1A]">Active</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input type="checkbox" checked={form.isDefault} onChange={e => setField('isDefault', e.target.checked)} className="rounded" />
                        <span className="text-sm font-semibold text-[#1C1B1A]">Default model</span>
                      </label>
                    </div>
                  </div>

                  {/* Config section */}
                  <div className="border-t border-[#E5E0D8] pt-4">
                    <h3 className="text-sm font-bold text-[#1C1B1A] mb-3">Model Config</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Max Tokens', field: 'config.maxTokens', type: 'number' },
                        { label: 'Timeout (ms)', field: 'config.timeoutMs', type: 'number' },
                        { label: 'Temperature', field: 'config.temperature', type: 'number', step: '0.1' },
                        { label: 'Top P', field: 'config.topP', type: 'number', step: '0.05' },
                        { label: 'Reasoning Budget', field: 'config.reasoningBudget', type: 'number' },
                      ].map(({ label, field, type, step }) => (
                        <div key={field}>
                          <label className="block text-xs font-semibold text-[#6B7280] mb-1">{label}</label>
                          <input
                            type={type}
                            step={step}
                            className="w-full border border-[#E5E0D8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4755B]/30 focus:border-[#D4755B]"
                            value={form.config[field.split('.')[1]] ?? ''}
                            onChange={e => {
                              const raw = e.target.value;
                              const val = raw === '' ? null : Number(raw);
                              setField(field, val);
                            }}
                          />
                        </div>
                      ))}
                      <div className="flex items-end pb-2">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={!!form.config.enableThinking}
                            onChange={e => setField('config.enableThinking', e.target.checked)}
                            className="rounded"
                          />
                          <span className="text-xs font-semibold text-[#6B7280]">Enable Thinking</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 px-5 py-4 border-t border-[#E5E0D8]">
                  <button
                    onClick={closeForm}
                    className="px-4 py-2 text-sm text-[#6B7280] hover:text-[#1C1B1A] rounded-lg hover:bg-[#F3F0EB] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 text-sm font-semibold text-white bg-[#D4755B] hover:bg-[#C05E44] rounded-lg transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Model'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AIModels;
