import {createPinia} from 'pinia'

export const pinia = createPinia()

export {useLighthouseStore} from './lighthouseStore'
export {useSettingsStore} from './settingsStore'
export {useHistoryStore} from './historyStore'
export {useScoreHistoryStore} from './scoreHistoryStore'
export {useWatchlistStore} from './watchlistStore'
export {useGeoStore} from './geoStore'
export {useGeoHistoryStore} from './geoHistoryStore'
export {useSearchConsoleHistoryStore} from './searchConsoleHistoryStore'
