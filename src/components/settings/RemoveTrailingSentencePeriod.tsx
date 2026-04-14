import React from "react";
import { useTranslation } from "react-i18next";
import { ToggleSwitch } from "../ui/ToggleSwitch";
import { useSettings } from "../../hooks/useSettings";

interface RemoveTrailingSentencePeriodProps {
  descriptionMode?: "inline" | "tooltip";
  grouped?: boolean;
}

export const RemoveTrailingSentencePeriod: React.FC<
  RemoveTrailingSentencePeriodProps
> = React.memo(({ descriptionMode = "tooltip", grouped = false }) => {
  const { t } = useTranslation();
  const { getSetting, updateSetting, isUpdating } = useSettings();

  const enabled = getSetting("replace_sentence_period_with_space") ?? false;

  return (
    <ToggleSwitch
      checked={enabled}
      onChange={(value) => updateSetting("replace_sentence_period_with_space", value)}
      isUpdating={isUpdating("replace_sentence_period_with_space")}
      label={t("settings.advanced.removeTrailingSentencePeriod.label")}
      description={t("settings.advanced.removeTrailingSentencePeriod.description")}
      descriptionMode={descriptionMode}
      grouped={grouped}
    />
  );
});
