<script setup>
/**
 * Modale « Guide du Mode Crawl » : contenu d'aide statique (modes de découverte,
 * services d'analyse, tableau de compatibilité, démarrage du serveur).
 * Extraite de CrawlView pour alléger la vue.
 */
defineProps({
  open: {type: Boolean, default: false}
})
const emit = defineEmits(['close'])
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="modal-overlay" @click.self="emit('close')">
        <div class="modal-content">
          <!-- Header -->
          <div class="modal-header">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-bold text-gray-900 dark:text-white">{{ $t('crawl.guideModalTitle') }}</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">{{ $t('crawl.guideModalSubtitle') }}</p>
              </div>
            </div>
            <button
                class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                type="button"
                @click="emit('close')"
            >
              <svg class="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M6 18L18 6M6 6l12 12" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
              </svg>
            </button>
          </div>

          <!-- Content -->
          <div class="modal-body">
            <!-- Discovery modes -->
            <div class="guide-section">
              <h4 class="guide-section-title">
                <svg class="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                </svg>
                {{ $t('crawl.guideDiscoveryTitle') }}
              </h4>

              <div class="guide-grid">
                <div class="guide-card guide-card-warning">
                  <div class="guide-card-header">
                    <span class="guide-card-badge guide-card-badge-warning">{{ $t('crawl.guideServerRequired') }}</span>
                    <strong>{{ $t('crawl.modeAuto') }}</strong>
                  </div>
                  <p>{{ $t('crawl.guideAutoDesc') }}</p>
                </div>

                <div class="guide-card guide-card-warning">
                  <div class="guide-card-header">
                    <span class="guide-card-badge guide-card-badge-warning">{{ $t('crawl.guideServerRequired') }}</span>
                    <strong>{{ $t('crawl.modeSitemap') }}</strong>
                  </div>
                  <p>{{ $t('crawl.guideSitemapDesc') }}</p>
                </div>

                <div class="guide-card guide-card-success">
                  <div class="guide-card-header">
                    <span class="guide-card-badge guide-card-badge-success">{{ $t('crawl.guideNoServer') }}</span>
                    <strong>{{ $t('crawl.modeManual') }}</strong>
                  </div>
                  <p>{{ $t('crawl.guideManualDesc') }}</p>
                </div>
              </div>
            </div>

            <!-- Analysis services -->
            <div class="guide-section">
              <h4 class="guide-section-title">
                <svg class="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                </svg>
                {{ $t('crawl.guideServicesTitle') }}
              </h4>

              <div class="guide-grid">
                <div class="guide-card guide-card-success">
                  <div class="guide-card-header">
                    <span class="guide-card-badge guide-card-badge-success">{{ $t('crawl.guideNoServer') }}</span>
                    <strong>{{ $t('crawl.pageSpeedName') }}</strong>
                  </div>
                  <p>{{ $t('crawl.guidePageSpeedDesc') }}</p>
                </div>

                <div class="guide-card guide-card-warning">
                  <div class="guide-card-header">
                    <span class="guide-card-badge guide-card-badge-warning">{{ $t('crawl.guideServerRequired') }}</span>
                    <strong>{{ $t('crawl.localName') }}</strong>
                  </div>
                  <p>{{ $t('crawl.guideLocalDesc') }}</p>
                </div>
              </div>
            </div>

            <!-- Compatibility table -->
            <div class="guide-section">
              <h4 class="guide-section-title">
                <svg class="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                </svg>
                {{ $t('crawl.guideCompatTitle') }}
              </h4>

              <div class="overflow-x-auto">
                <table class="guide-table">
                  <thead>
                    <tr>
                      <th>{{ $t('crawl.guideColDiscovery') }}</th>
                      <th>{{ $t('crawl.guideColService') }}</th>
                      <th>{{ $t('crawl.guideColServer') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{{ $t('crawl.modeManual') }}</td>
                      <td>{{ $t('crawl.pageSpeedName') }}</td>
                      <td><span class="text-emerald-600 dark:text-emerald-400 font-medium">{{ $t('crawl.guideNotRequired') }}</span></td>
                    </tr>
                    <tr>
                      <td>{{ $t('crawl.modeManual') }}</td>
                      <td>{{ $t('crawl.localName') }}</td>
                      <td><span class="text-amber-600 dark:text-amber-400 font-medium">{{ $t('crawl.guideRequired') }}</span></td>
                    </tr>
                    <tr>
                      <td>{{ $t('crawl.guideAutoSitemap') }}</td>
                      <td>{{ $t('crawl.pageSpeedName') }}</td>
                      <td><span class="text-amber-600 dark:text-amber-400 font-medium">{{ $t('crawl.guideRequired') }}</span></td>
                    </tr>
                    <tr>
                      <td>{{ $t('crawl.guideAutoSitemap') }}</td>
                      <td>{{ $t('crawl.localName') }}</td>
                      <td><span class="text-amber-600 dark:text-amber-400 font-medium">{{ $t('crawl.guideRequired') }}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Server instructions -->
            <div class="guide-section">
              <h4 class="guide-section-title">
                <svg class="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                </svg>
                {{ $t('crawl.guideServerTitle') }}
              </h4>

              <div class="guide-code">
                <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">{{ $t('crawl.guideFirstInstall') }}</p>
                <code class="guide-code-block">npm run server:install</code>

                <p class="text-sm text-gray-600 dark:text-gray-400 mb-2 mt-4">{{ $t('crawl.guideStart') }}</p>
                <code class="guide-code-block">npm run server</code>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="modal-footer">
            <button
                class="btn-primary"
                type="button"
                @click="emit('close')"
            >
              {{ $t('crawl.guideUnderstood') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Modal styles */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 50;
}

.modal-content {
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 1rem;
  width: 100%;
  max-width: 700px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-primary);
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-primary);
  display: flex;
  justify-content: flex-end;
}

/* Guide sections */
.guide-section {
  margin-bottom: 1.5rem;
}

.guide-section:last-child {
  margin-bottom: 0;
}

.guide-section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.75rem;
}

.guide-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
}

.guide-card {
  padding: 1rem;
  border-radius: 0.75rem;
  border: 1px solid var(--border-primary);
  background: var(--bg-secondary);
}

.guide-card p {
  font-size: 0.8125rem;
  color: var(--text-tertiary);
  line-height: 1.5;
  margin: 0;
}

.guide-card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
}

.guide-card-header strong {
  color: var(--text-primary);
  font-size: 0.9375rem;
}

.guide-card-badge {
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.guide-card-badge-success {
  background: rgba(16, 185, 129, 0.15);
  color: #059669;
}

.guide-card-badge-warning {
  background: rgba(245, 158, 11, 0.15);
  color: #d97706;
}

html.dark .guide-card-badge-success {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
}

html.dark .guide-card-badge-warning {
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
}

.guide-card-success {
  border-color: rgba(16, 185, 129, 0.3);
}

.guide-card-warning {
  border-color: rgba(245, 158, 11, 0.3);
}

/* Guide table */
.guide-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.guide-table th,
.guide-table td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid var(--border-primary);
}

.guide-table th {
  font-weight: 600;
  color: var(--text-secondary);
  background: var(--bg-secondary);
}

.guide-table td {
  color: var(--text-primary);
}

.guide-table tbody tr:hover {
  background: var(--bg-secondary);
}

/* Guide code */
.guide-code-block {
  display: block;
  padding: 0.75rem 1rem;
  background: #1f2937;
  color: #34d399;
  border-radius: 0.5rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.875rem;
}

/* Primary button */
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px -2px rgba(16, 185, 129, 0.4);
}

/* Modal transition */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
  transition: transform 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.95) translateY(10px);
}
</style>
