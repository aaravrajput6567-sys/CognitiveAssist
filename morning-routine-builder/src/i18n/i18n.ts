export const EN_STRINGS: Record<string, string> = {
  // Common UI
  'app.title': 'Morning Routine Builder',
  'app.subtitle': 'Daily Memory & Routine Practice',
  'app.disclaimer': 'Research prototype. Not a medical device. Not for diagnosis or treatment.',
  'btn.next': 'Next',
  'btn.back': 'Back',
  'btn.start': 'Start Practice',
  'btn.continue': 'Continue',
  'btn.done': 'I am Done',
  'btn.undo': 'Take Back Last Step',
  'btn.hint': 'Need a Little Hint?',
  'btn.finish_session': 'Finish Session',
  'btn.caregiver_portal': 'Caregiver Portal',
  'btn.close': 'Close',
  'btn.cancel': 'Cancel',
  'btn.save': 'Save Settings',
  'btn.export_json': 'Export Data (JSON)',
  'btn.export_csv': 'Export Data (CSV)',
  'btn.delete_all': 'Delete All Local Data',

  // Onboarding
  'onboarding.welcome': 'Welcome to Your Morning Practice',
  'onboarding.instructions': 'Take a few peaceful moments to walk through familiar morning activities, one gentle step at a time.',
  'onboarding.font_size': 'Text Size',
  'onboarding.font_normal': 'Comfortable (24px)',
  'onboarding.font_large': 'Large (32px)',
  'onboarding.font_xlarge': 'Extra Large (40px)',
  'onboarding.contrast': 'Screen Contrast',
  'onboarding.theme_dark': 'High-Contrast Dark',
  'onboarding.theme_light': 'High-Contrast Light',
  'onboarding.theme_warm': 'Warm Cream',
  'onboarding.read_aloud': 'Spoken Voice (Read-Aloud)',
  'onboarding.read_aloud_desc': 'Read steps and friendly questions out loud',
  'onboarding.begin_calibration': 'Let’s Begin with a Warm-Up',

  // Calibration
  'calibration.title': 'Gentle Warm-Up',
  'calibration.instruction': 'Before we begin, let’s do three simple warm-up taps. Tap the icon whenever you feel comfortable.',
  'calibration.tap_1': 'Tap the bright morning sun',
  'calibration.tap_2': 'Tap the warm coffee cup',
  'calibration.tap_3': 'Tap the green garden leaf',
  'calibration.completed': 'Wonderful! Your warm-up is complete.',

  // Encoding Phase
  'encoding.header': 'Let’s Look at Today’s Routine',
  'encoding.step_progress': 'Step {current} of {total}',
  'encoding.hint': 'Take your time to look at each step. Tap "Next" when you are ready.',

  // Retention Phase
  'retention.header': 'A Friendly Morning Hello',
  'retention.ready_prompt': 'When you are ready to recall the routine, tap below.',
  'retention.ready_button': 'Ready to Remember Routine',

  // Retrieval Phase
  'retrieval.header': 'What Did Your Morning Look Like?',
  'retrieval.instruction': 'Tap the cards below in the order you remember. They will settle into the numbered slots.',
  'retrieval.slots_title': 'Your Morning Steps',
  'retrieval.bank_title': 'Available Activity Cards',
  'retrieval.empty_slot': 'Slot {num}',
  'retrieval.undo_desc': 'Removes the most recent card placed',
  'retrieval.done_desc': 'Submit your morning steps',

  // Wrap Up
  'wrapup.title': 'Wonderful Effort Today!',
  'wrapup.completed_message': 'You have completed all {count} routines for today’s session.',
  'wrapup.encouragement': 'Every gentle practice keeps your mind active, connected, and engaged. Have a peaceful rest of your day!',
  'wrapup.progress_note': 'All {count} routines safely completed on your device.',

  // Caregiver Portal
  'caregiver.title': 'Caregiver & Clinician Dashboard',
  'caregiver.pin_prompt': 'Enter 4-Digit Caregiver PIN to Access',
  'caregiver.pin_error': 'PIN not recognized. Please try again.',
  'caregiver.tab_history': 'Session History',
  'caregiver.tab_settings': 'Settings & Tuning',
  'caregiver.tab_export': 'Data Export & Privacy',
  'caregiver.nickname': 'Participant Profile Nickname',
  'caregiver.session_length': 'Trials Per Session',
  'caregiver.current_delta': 'Current Difficulty (delta)',
  'caregiver.smoothed_ct': 'Smoothed CT-Score (CT~)',
  'caregiver.distress_rate': 'Distress Flag Rate',
  'caregiver.total_sessions': 'Total Recorded Sessions',
  'caregiver.delete_confirm': 'Are you sure you want to permanently delete all local sessions and calibration data? This cannot be undone.',
};

export const ES_STRINGS: Record<string, string> = {
  'app.title': 'Creador de Rutinas Matutinas',
  'app.subtitle': 'Práctica Diaria de Memoria y Rutina',
  'app.disclaimer': 'Prototipo de investigación. No es un dispositivo médico. No apto para diagnóstico ni tratamiento.',
  'btn.next': 'Siguiente',
  'btn.back': 'Atrás',
  'btn.start': 'Comenzar Práctica',
  'btn.continue': 'Continuar',
  'btn.done': 'He Terminado',
  'btn.undo': 'Deshacer Último Paso',
  'btn.hint': '¿Necesitas una pequeña pista?',
  'btn.finish_session': 'Terminar Sesión',
  'btn.caregiver_portal': 'Portal del Cuidador',
  'btn.close': 'Cerrar',
  'btn.cancel': 'Cancelar',
  'btn.save': 'Guardar Ajustes',
  'btn.export_json': 'Exportar Datos (JSON)',
  'btn.export_csv': 'Exportar Datos (CSV)',
  'btn.delete_all': 'Eliminar Todos los Datos Locales',
};

class I18nManager {
  private currentLocale = 'en';
  private dictionaries: Record<string, Record<string, string>> = {
    en: EN_STRINGS,
    es: ES_STRINGS,
  };

  setLocale(locale: string) {
    if (this.dictionaries[locale]) {
      this.currentLocale = locale;
    } else {
      this.currentLocale = 'en';
    }
  }

  getLocale(): string {
    return this.currentLocale;
  }

  t(key: string, params?: Record<string, string | number>): string {
    const dict = this.dictionaries[this.currentLocale] || EN_STRINGS;
    let text = dict[key] || EN_STRINGS[key] || key;

    if (params) {
      for (const [pKey, pVal] of Object.entries(params)) {
        text = text.replace(new RegExp(`\\{${pKey}\\}`, 'g'), String(pVal));
      }
    }
    return text;
  }
}

export const i18n = new I18nManager();
