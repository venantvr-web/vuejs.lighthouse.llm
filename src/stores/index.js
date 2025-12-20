import {createPinia} from 'pinia'

export const pinia = createPinia()

export {useLighthouseStore} from './lighthouseStore'
export {useSettingsStore} from './settingsStore'
export {useHistoryStore} from './historyStore'
