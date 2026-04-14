import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { TermCorrectionRule } from "@/bindings";
import { useSettings } from "../../hooks/useSettings";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { SettingContainer } from "../ui/SettingContainer";
import { Textarea } from "../ui/Textarea";

interface TermCorrectionsProps {
  descriptionMode?: "inline" | "tooltip";
  grouped?: boolean;
}

const sanitize = (value: string) => value.replace(/[<>"'&]/g, "").trim();

const parseAliases = (value: string): string[] => {
  const tokens = value
    .split(/[\n,，;；]/g)
    .map((v) => sanitize(v))
    .filter(Boolean);
  return Array.from(new Set(tokens));
};

export const TermCorrections: React.FC<TermCorrectionsProps> = React.memo(
  ({ descriptionMode = "tooltip", grouped = false }) => {
    const { t } = useTranslation();
    const { getSetting, updateSetting, isUpdating } = useSettings();
    const rules = (getSetting("term_corrections") || []) as TermCorrectionRule[];

    const [canonical, setCanonical] = useState("");
    const [aliasesText, setAliasesText] = useState("");
    const [wholeWord, setWholeWord] = useState(false);
    const [caseSensitive, setCaseSensitive] = useState(false);

    const sortedRules = useMemo(
      () => [...rules].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0)),
      [rules],
    );
    const [aliasDrafts, setAliasDrafts] = useState<Record<string, string>>({});

    const handleAddRule = async () => {
      const canonicalValue = sanitize(canonical);
      const aliases = parseAliases(aliasesText).filter(
        (a) => a.toLowerCase() !== canonicalValue.toLowerCase(),
      );

      if (!canonicalValue) {
        toast.error(
          t("settings.advanced.termCorrections.errors.emptyCanonical", {
            defaultValue: "Please enter a standard term.",
          }),
        );
        return;
      }

      if (aliases.length === 0) {
        toast.error(
          t("settings.advanced.termCorrections.errors.emptyAliases", {
            defaultValue: "Please add at least one mistaken term.",
          }),
        );
        return;
      }

      const existing = rules.find(
        (r) => r.canonical?.toLowerCase() === canonicalValue.toLowerCase(),
      );

      let nextRules: TermCorrectionRule[];
      if (existing) {
        const mergedAliases = Array.from(
          new Set([...(existing.aliases || []), ...aliases]),
        );
        nextRules = rules.map((r) =>
          r.canonical?.toLowerCase() === canonicalValue.toLowerCase()
            ? { ...r, aliases: mergedAliases }
            : r,
        );
      } else {
        const nextPriority = (rules.length + 1) * 10;
        nextRules = [
          ...rules,
          {
            canonical: canonicalValue,
            aliases,
            enabled: true,
            case_sensitive: caseSensitive,
            whole_word: wholeWord,
            priority: nextPriority,
          },
        ];
      }

      await updateSetting("term_corrections", nextRules as any);
      setCanonical("");
      setAliasesText("");
      setWholeWord(false);
      setCaseSensitive(false);
    };

    const handleRemove = async (canonicalValue: string) => {
      const nextRules = rules.filter((r) => r.canonical !== canonicalValue);
      await updateSetting("term_corrections", nextRules as any);
    };

    const handleToggle = async (
      canonicalValue: string,
      key: "enabled" | "whole_word" | "case_sensitive",
      value: boolean,
    ) => {
      const nextRules = rules.map((r, i) =>
        r.canonical === canonicalValue ? { ...r, [key]: value } : r,
      );
      await updateSetting("term_corrections", nextRules as any);
    };

    const handleAddAliasToRule = async (canonicalValue: string) => {
      const raw = aliasDrafts[canonicalValue] || "";
      const newAliases = parseAliases(raw);
      if (newAliases.length === 0) {
        return;
      }

      const nextRules = rules.map((r) => {
        if (r.canonical !== canonicalValue) {
          return r;
        }
        const mergedAliases = Array.from(
          new Set([...(r.aliases || []), ...newAliases]),
        ).filter((a) => a.toLowerCase() !== canonicalValue.toLowerCase());
        return { ...r, aliases: mergedAliases };
      });

      await updateSetting("term_corrections", nextRules as any);
      setAliasDrafts((prev) => ({ ...prev, [canonicalValue]: "" }));
    };

    const handleRemoveAliasFromRule = async (
      canonicalValue: string,
      aliasToRemove: string,
    ) => {
      const nextRules = rules.map((r) => {
        if (r.canonical !== canonicalValue) {
          return r;
        }
        return {
          ...r,
          aliases: (r.aliases || []).filter((a) => a !== aliasToRemove),
        };
      });

      await updateSetting("term_corrections", nextRules as any);
    };

    return (
      <>
        <SettingContainer
          title={t("settings.advanced.termCorrections.title", {
            defaultValue: "Term Correction Dictionary",
          })}
          description={t("settings.advanced.termCorrections.description", {
            defaultValue:
              "Map one standard term to multiple ASR mistakes. Example: umami <- 五妈咪, 乌妈咪",
          })}
          descriptionMode={descriptionMode}
          grouped={grouped}
        >
          <div className="w-full space-y-3 rounded-lg border border-mid-gray/20 bg-mid-gray/5 p-3">
            <div className="grid gap-2 md:grid-cols-[220px_1fr]">
              <Input
                type="text"
                className="w-full"
                value={canonical}
                onChange={(e) => setCanonical(e.target.value)}
                placeholder={t("settings.advanced.termCorrections.standardPlaceholder", {
                  defaultValue: "Standard term",
                })}
                variant="compact"
                disabled={isUpdating("term_corrections")}
              />
              <Textarea
                value={aliasesText}
                onChange={(e) => setAliasesText(e.target.value)}
                placeholder={t("settings.advanced.termCorrections.aliasesPlaceholder", {
                  defaultValue: "Mistaken terms (comma/new line)",
                })}
                variant="compact"
                disabled={isUpdating("term_corrections")}
                className="min-h-[60px]"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-mid-gray">
              <div className="flex items-center gap-4">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={wholeWord}
                    onChange={(e) => setWholeWord(e.target.checked)}
                  />
                  {t("settings.advanced.termCorrections.wholeWord", {
                    defaultValue: "Whole word only",
                  })}
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={caseSensitive}
                    onChange={(e) => setCaseSensitive(e.target.checked)}
                  />
                  {t("settings.advanced.termCorrections.caseSensitive", {
                    defaultValue: "Case sensitive",
                  })}
                </label>
              </div>

              <Button
                onClick={handleAddRule}
                disabled={isUpdating("term_corrections")}
                variant="primary"
                size="md"
              >
                {t("settings.advanced.termCorrections.addRule", {
                  defaultValue: "Add/merge rule",
                })}
              </Button>
            </div>
          </div>
        </SettingContainer>

        {sortedRules.length > 0 && (
          <div
            className={`px-4 p-3 ${grouped ? "" : "rounded-lg border border-mid-gray/20"} space-y-2`}
          >
            {sortedRules.map((rule, index) => (
              <div
                key={`${rule.canonical}-${index}`}
                className="rounded-md border border-mid-gray/20 p-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-sm break-all">
                    {rule.canonical}
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleRemove(rule.canonical)}
                    disabled={isUpdating("term_corrections")}
                  >
                    {t("settings.advanced.termCorrections.remove", {
                      defaultValue: "Remove",
                    })}
                  </Button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {(rule.aliases || []).length > 0 ? (
                    (rule.aliases || []).map((alias) => (
                      <button
                        key={`${rule.canonical}-${alias}`}
                        type="button"
                        className="inline-flex items-center gap-1 rounded-full border border-mid-gray/30 bg-mid-gray/10 px-2 py-1 text-xs hover:bg-mid-gray/20"
                        onClick={() => handleRemoveAliasFromRule(rule.canonical, alias)}
                        title={t("settings.advanced.termCorrections.removeAlias", {
                          defaultValue: "Click to remove",
                        })}
                      >
                        <span>{alias}</span>
                        <span aria-hidden>×</span>
                      </button>
                    ))
                  ) : (
                    <span className="text-xs text-mid-gray">
                      {t("settings.advanced.termCorrections.noAliases", {
                        defaultValue: "No aliases",
                      })}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-mid-gray mt-2">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rule.enabled ?? true}
                      onChange={(e) =>
                        handleToggle(rule.canonical, "enabled", e.target.checked)
                      }
                    />
                    {t("settings.advanced.termCorrections.enabled", {
                      defaultValue: "Enabled",
                    })}
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rule.whole_word ?? false}
                      onChange={(e) =>
                        handleToggle(
                          rule.canonical,
                          "whole_word",
                          e.target.checked,
                        )
                      }
                    />
                    {t("settings.advanced.termCorrections.wholeWord", {
                      defaultValue: "Whole word only",
                    })}
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rule.case_sensitive ?? false}
                      onChange={(e) =>
                        handleToggle(
                          rule.canonical,
                          "case_sensitive",
                          e.target.checked,
                        )
                      }
                    />
                    {t("settings.advanced.termCorrections.caseSensitive", {
                      defaultValue: "Case sensitive",
                    })}
                  </label>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    type="text"
                    variant="compact"
                    className="max-w-80"
                    placeholder={t(
                      "settings.advanced.termCorrections.addAliasPlaceholder",
                      { defaultValue: "Add mistaken terms" },
                    )}
                    value={aliasDrafts[rule.canonical] || ""}
                    onChange={(e) =>
                      setAliasDrafts((prev) => ({
                        ...prev,
                        [rule.canonical]: e.target.value,
                      }))
                    }
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleAddAliasToRule(rule.canonical)}
                    disabled={isUpdating("term_corrections")}
                  >
                    {t("settings.advanced.termCorrections.addAlias", {
                      defaultValue: "Add alias",
                    })}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </>
    );
  },
);
