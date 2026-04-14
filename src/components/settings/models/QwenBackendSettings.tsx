import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { commands } from "@/bindings";
import { useSettings } from "../../../hooks/useSettings";
import { SettingContainer } from "../../ui/SettingContainer";
import { Input } from "../../ui/Input";
import { Button } from "../../ui/Button";

export const QwenBackendSettings: React.FC = () => {
  const { t } = useTranslation();
  const { getSetting, updateSetting, isUpdating } = useSettings();

  const asrBackend = getSetting("asr_backend") || "local";
  const qwenBaseUrl = getSetting("qwen_base_url") || "http://127.0.0.1:8000/v1";
  const qwenModelId = getSetting("qwen_model_id") || "/mnt/d/models/Qwen3-ASR-0.6B";
  const qwenApiKey = getSetting("qwen_api_key") || "";
  const qwenTimeoutSec = getSetting("qwen_timeout_sec") || 120;

  const [draftBaseUrl, setDraftBaseUrl] = useState(qwenBaseUrl);
  const [draftModelId, setDraftModelId] = useState(qwenModelId);
  const [draftApiKey, setDraftApiKey] = useState(qwenApiKey);
  const [draftTimeoutSec, setDraftTimeoutSec] = useState(String(qwenTimeoutSec));

  const [detectedModels, setDetectedModels] = useState<string[]>([]);
  const [isDetectingModels, setIsDetectingModels] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setDraftBaseUrl(qwenBaseUrl);
    setDraftModelId(qwenModelId);
    setDraftApiKey(qwenApiKey);
    setDraftTimeoutSec(String(qwenTimeoutSec));
  }, [qwenBaseUrl, qwenModelId, qwenApiKey, qwenTimeoutSec]);

  const parsedTimeout = useMemo(
    () => Number.parseInt(draftTimeoutSec, 10),
    [draftTimeoutSec],
  );

  const timeoutIsValid = Number.isFinite(parsedTimeout) && parsedTimeout > 0;

  const hasDraftChanges =
    draftBaseUrl !== qwenBaseUrl ||
    draftModelId !== qwenModelId ||
    draftApiKey !== qwenApiKey ||
    draftTimeoutSec !== String(qwenTimeoutSec);

  const isSaving =
    isUpdating("qwen_base_url") ||
    isUpdating("qwen_model_id") ||
    isUpdating("qwen_api_key") ||
    isUpdating("qwen_timeout_sec");

  const handleDetectModels = async () => {
    setIsDetectingModels(true);
    setDetectError(null);

    try {
      const result = await commands.fetchQwenModels(
        draftBaseUrl.trim(),
        draftApiKey.trim() ? draftApiKey.trim() : null,
      );

      if (result.status === "ok") {
        const models = result.data;
        setDetectedModels(models);

        if (models.length > 0 && !models.includes(draftModelId)) {
          setDraftModelId(models[0]);
        }

        if (models.length === 0) {
          setDetectError(
            t("settings.models.qwenNoModelsFound", {
              defaultValue: "No model IDs returned by this endpoint.",
            }),
          );
        }
      } else {
        setDetectedModels([]);
        setDetectError(result.error || "Failed to detect model IDs");
      }
    } catch (error) {
      setDetectedModels([]);
      setDetectError(String(error));
    } finally {
      setIsDetectingModels(false);
    }
  };

  const handleSave = async () => {
    setSaveError(null);

    if (!timeoutIsValid) {
      setSaveError(
        t("settings.models.qwenTimeoutInvalid", {
          defaultValue: "Timeout must be a positive number.",
        }),
      );
      return;
    }

    try {
      if (draftBaseUrl !== qwenBaseUrl) {
        await updateSetting("qwen_base_url", draftBaseUrl);
      }
      if (draftModelId !== qwenModelId) {
        await updateSetting("qwen_model_id", draftModelId);
      }
      if (draftApiKey !== qwenApiKey) {
        await updateSetting("qwen_api_key", draftApiKey);
      }
      if (parsedTimeout !== qwenTimeoutSec) {
        await updateSetting("qwen_timeout_sec", parsedTimeout);
      }
    } catch (error) {
      setSaveError(String(error));
    }
  };

  return (
    <div className="rounded-lg border border-mid-gray/20 bg-mid-gray/5 p-4 space-y-3">
      <h2 className="text-sm font-semibold">
        {t("settings.models.asrBackendTitle", { defaultValue: "ASR Backend" })}
      </h2>

      <SettingContainer
        title={t("settings.models.asrBackendMode", { defaultValue: "Backend mode" })}
        description={t("settings.models.asrBackendModeDesc", {
          defaultValue:
            "Local uses Handy built-in models. Qwen HTTP uses your deployed vLLM/OpenAI-compatible API.",
        })}
        descriptionMode="tooltip"
        grouped
      >
        <div className="inline-flex rounded-md border border-mid-gray/40 overflow-hidden">
          <button
            type="button"
            className={`px-3 py-1.5 text-sm ${
              asrBackend === "local"
                ? "bg-logo-primary/80 text-white"
                : "bg-transparent hover:bg-mid-gray/10"
            }`}
            disabled={isUpdating("asr_backend")}
            onClick={() => updateSetting("asr_backend", "local")}
          >
            {t("settings.models.localBackend", { defaultValue: "Local" })}
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 text-sm border-l border-mid-gray/40 ${
              asrBackend === "qwen_http"
                ? "bg-logo-primary/80 text-white"
                : "bg-transparent hover:bg-mid-gray/10"
            }`}
            disabled={isUpdating("asr_backend")}
            onClick={() => updateSetting("asr_backend", "qwen_http")}
          >
            {t("settings.models.qwenHttpBackend", { defaultValue: "Qwen HTTP" })}
          </button>
        </div>
      </SettingContainer>

      {asrBackend === "qwen_http" && (
        <div className="space-y-2 rounded-md border border-mid-gray/20 p-3 bg-background/30">
          <SettingContainer
            title={t("settings.models.qwenBaseUrl", { defaultValue: "Base URL" })}
            description={t("settings.models.qwenBaseUrlDesc", {
              defaultValue: "Example: http://127.0.0.1:8000/v1",
            })}
            descriptionMode="tooltip"
            grouped
          >
            <Input
              type="text"
              variant="compact"
              className="w-full"
              value={draftBaseUrl}
              onChange={(e) => setDraftBaseUrl(e.target.value)}
              disabled={isSaving}
            />
          </SettingContainer>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={handleDetectModels}
              disabled={isDetectingModels || !draftBaseUrl.trim()}
            >
              {isDetectingModels
                ? t("settings.models.qwenDetectingModels", {
                    defaultValue: "Detecting...",
                  })
                : t("settings.models.qwenDetectModels", {
                    defaultValue: "Detect Models",
                  })}
            </Button>
            {detectedModels.length > 0 && (
              <span className="text-xs text-text/60">
                {t("settings.models.qwenDetectedCount", {
                  defaultValue: "{{count}} found",
                  count: detectedModels.length,
                })}
              </span>
            )}
          </div>

          {detectError && (
            <div className="text-xs text-amber-500 break-all">{detectError}</div>
          )}

          <SettingContainer
            title={t("settings.models.qwenModelId", { defaultValue: "Model ID" })}
            description={t("settings.models.qwenModelIdDesc", {
              defaultValue: "Must match /v1/models id from your Qwen service.",
            })}
            descriptionMode="tooltip"
            grouped
          >
            <Input
              type="text"
              variant="compact"
              className="w-full"
              value={draftModelId}
              onChange={(e) => setDraftModelId(e.target.value)}
              disabled={isSaving}
            />

            {detectedModels.length > 0 && (
              <select
                className="mt-2 w-full rounded-md border border-mid-gray/40 bg-mid-gray/10 px-2 py-1 text-sm"
                value={draftModelId}
                onChange={(e) => setDraftModelId(e.target.value)}
                disabled={isSaving}
              >
                {detectedModels.map((modelId) => (
                  <option key={modelId} value={modelId}>
                    {modelId}
                  </option>
                ))}
              </select>
            )}
          </SettingContainer>

          <div className="grid gap-2 md:grid-cols-2">
            <SettingContainer
              title={t("settings.models.qwenApiKey", { defaultValue: "API Key" })}
              description={t("settings.models.qwenApiKeyDesc", {
                defaultValue: "Leave empty for local service (uses EMPTY).",
              })}
              descriptionMode="tooltip"
              grouped
            >
              <Input
                type="password"
                variant="compact"
                className="w-full"
                value={draftApiKey}
                onChange={(e) => setDraftApiKey(e.target.value)}
                disabled={isSaving}
              />
            </SettingContainer>

            <SettingContainer
              title={t("settings.models.qwenTimeout", { defaultValue: "Timeout (sec)" })}
              description={t("settings.models.qwenTimeoutDesc", {
                defaultValue: "Request timeout for one transcription.",
              })}
              descriptionMode="tooltip"
              grouped
            >
              <Input
                type="number"
                min={1}
                variant="compact"
                className="w-full"
                value={draftTimeoutSec}
                onChange={(e) => setDraftTimeoutSec(e.target.value)}
                disabled={isSaving}
              />
            </SettingContainer>
          </div>

          {!timeoutIsValid && draftTimeoutSec.trim().length > 0 && (
            <div className="text-xs text-amber-500">
              {t("settings.models.qwenTimeoutInvalid", {
                defaultValue: "Timeout must be a positive number.",
              })}
            </div>
          )}

          {saveError && (
            <div className="text-xs text-red-500 break-all">{saveError}</div>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-mid-gray/20 pt-3">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setDraftBaseUrl(qwenBaseUrl);
                setDraftModelId(qwenModelId);
                setDraftApiKey(qwenApiKey);
                setDraftTimeoutSec(String(qwenTimeoutSec));
                setSaveError(null);
              }}
              disabled={isSaving || !hasDraftChanges}
            >
              {t("common.cancel", { defaultValue: "Reset" })}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isSaving || !hasDraftChanges || !timeoutIsValid}
            >
              {isSaving
                ? t("common.saving", { defaultValue: "Saving..." })
                : t("common.save", { defaultValue: "Save" })}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
