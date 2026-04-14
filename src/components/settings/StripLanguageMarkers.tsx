import React from "react";
import { useTranslation } from "react-i18next";
import { ToggleSwitch } from "../ui/ToggleSwitch";
import { useSettings } from "../../hooks/useSettings";

interface StripLanguageMarkersProps {
  descriptionMode?: "inline" | "tooltip";
  grouped?: boolean;
}

export const StripLanguageMarkers: React.FC<StripLanguageMarkersProps> =
  React.memo(({ descriptionMode = "tooltip", grouped = false }) => {
    const { t } = useTranslation();
    const { getSetting, updateSetting, isUpdating } = useSettings();

    const enabled = getSetting("strip_language_markers") ?? false;

    return (
      <ToggleSwitch
        checked={enabled}
        onChange={(value) => updateSetting("strip_language_markers", value)}
        isUpdating={isUpdating("strip_language_markers")}
        label={t("settings.advanced.stripLanguageMarkers.label")}
        description={t("settings.advanced.stripLanguageMarkers.description")}
        descriptionMode={descriptionMode}
        grouped={grouped}
      />
    );
  });
