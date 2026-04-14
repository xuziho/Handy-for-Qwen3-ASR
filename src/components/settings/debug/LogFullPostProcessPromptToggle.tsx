import React from "react";
import { useTranslation } from "react-i18next";
import { ToggleSwitch } from "../../ui/ToggleSwitch";
import { useSettings } from "../../../hooks/useSettings";

interface LogFullPostProcessPromptToggleProps {
  descriptionMode?: "inline" | "tooltip";
  grouped?: boolean;
}

export const LogFullPostProcessPromptToggle: React.FC<LogFullPostProcessPromptToggleProps> =
  React.memo(({ descriptionMode = "tooltip", grouped = false }) => {
    const { t } = useTranslation();
    const { getSetting, updateSetting, isUpdating } = useSettings();

    const enabled = getSetting("debug_log_full_post_process_prompt") || false;

    return (
      <ToggleSwitch
        checked={enabled}
        onChange={(next) =>
          updateSetting("debug_log_full_post_process_prompt", next)
        }
        isUpdating={isUpdating("debug_log_full_post_process_prompt")}
        label={t("settings.debug.logFullPostProcessPrompt.label")}
        description={t("settings.debug.logFullPostProcessPrompt.description")}
        descriptionMode={descriptionMode}
        grouped={grouped}
      />
    );
  });
