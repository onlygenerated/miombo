export interface NarrativeEvent {
  id: string;
  titleKey: string;    // i18n key
  bodyKey: string;     // i18n key
  icon: string;        // emoji
  severity: 'info' | 'warning' | 'critical' | 'positive';
}
