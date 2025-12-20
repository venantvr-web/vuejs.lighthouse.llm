<script setup>
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <!-- Header -->
    <header class="border-b border-gray-200 dark:border-gray-800">
      <div class="max-w-5xl mx-auto px-4 py-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center">
              <svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div>
              <h1 class="text-xl font-bold text-gray-900 dark:text-white">
                Lighthouse AI Analyzer
              </h1>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                Analyse intelligente de vos rapports Lighthouse
              </p>
            </div>
          </div>

          <!-- Header actions -->
          <div class="flex items-center gap-2">
            <!-- History link -->
            <router-link
              to="/history"
              class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Historique"
            >
              <svg class="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </router-link>

            <!-- Settings link -->
            <router-link
              to="/settings"
              class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Parametres"
            >
              <svg class="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </router-link>
          </div>
        </div>
      </div>
    </header>

    <!-- Main content -->
    <main class="flex-1 flex items-center justify-center p-4">
      <div class="w-full max-w-3xl">
        <!-- Title -->
        <div class="text-center mb-12">
          <h2 class="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Analysez et optimisez votre site web
          </h2>
          <p class="text-lg text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
            Obtenez des recommandations personnalisées générées par IA pour améliorer
            les performances, l'accessibilité et le SEO de votre site.
          </p>
        </div>

        <!-- Choice cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <!-- Live analysis -->
          <router-link
            to="/lighthouse"
            class="choice-card group"
          >
            <div class="card-icon bg-gradient-to-br from-primary-500 to-primary-700">
              <svg class="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </div>
            <h3 class="card-title">PageSpeed Insights</h3>
            <p class="card-description">
              Analyse via l'API Google PageSpeed Insights. Rapide, sans installation requise.
            </p>
            <div class="card-cta">
              <span>Analyser une URL</span>
              <svg class="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
          </router-link>

          <!-- Local Lighthouse -->
          <router-link
            to="/local"
            class="choice-card choice-card-local group"
          >
            <div class="card-icon bg-gradient-to-br from-green-500 to-green-700">
              <svg class="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
              </svg>
            </div>
            <h3 class="card-title">Chromium Local</h3>
            <p class="card-description">
              Analyse locale via Chromium. Illimitée, confidentielle, fonctionne avec l'intranet.
            </p>
            <div class="card-cta card-cta-local">
              <span>Lancer localement</span>
              <svg class="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
          </router-link>

          <!-- Import file -->
          <router-link
            to="/upload"
            class="choice-card group"
          >
            <div class="card-icon bg-gradient-to-br from-lighthouse-orange to-orange-700">
              <svg class="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 class="card-title">Importer un rapport</h3>
            <p class="card-description">
              Importez un fichier JSON Lighthouse exporté depuis Chrome DevTools.
            </p>
            <div class="card-cta">
              <span>Importer un fichier</span>
              <svg class="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
          </router-link>

          <!-- Crawl mode -->
          <router-link
            to="/crawl"
            class="choice-card choice-card-crawl group"
          >
            <div class="card-icon bg-gradient-to-br from-emerald-500 to-emerald-700">
              <svg class="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </div>
            <h3 class="card-title">Mode Crawl</h3>
            <p class="card-description">
              Analysez plusieurs pages et obtenez des scores agreges par template.
            </p>
            <div class="card-cta card-cta-crawl">
              <span>Crawler un site</span>
              <svg class="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
          </router-link>
        </div>

        <!-- Features -->
        <div class="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div class="text-center">
            <div class="w-12 h-12 mx-auto bg-lighthouse-green/10 rounded-xl flex items-center justify-center mb-3">
              <svg class="w-6 h-6 text-lighthouse-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 class="font-semibold text-gray-900 dark:text-white">Performance</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Optimisez vos Core Web Vitals
            </p>
          </div>

          <div class="text-center">
            <div class="w-12 h-12 mx-auto bg-lighthouse-orange/10 rounded-xl flex items-center justify-center mb-3">
              <svg class="w-6 h-6 text-lighthouse-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 class="font-semibold text-gray-900 dark:text-white">SEO</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Améliorez votre référencement
            </p>
          </div>

          <div class="text-center">
            <div class="w-12 h-12 mx-auto bg-primary-500/10 rounded-xl flex items-center justify-center mb-3">
              <svg class="w-6 h-6 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 class="font-semibold text-gray-900 dark:text-white">Accessibilité</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Rendez votre site inclusif
            </p>
          </div>
        </div>

        <!-- AI Badge -->
        <div class="mt-12 text-center">
          <span class="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500/10 to-purple-500/10 rounded-full text-sm">
            <svg class="w-4 h-4 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span class="text-gray-600 dark:text-gray-300">
              Propulse par <strong class="text-primary-600 dark:text-primary-400">Gemini</strong> / OpenAI / Claude / Ollama
            </span>
          </span>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.choice-card {
  display: flex;
  flex-direction: column;
  padding: 24px;
  background: var(--bg-elevated);
  border: 2px solid var(--border-primary);
  border-radius: 16px;
  transition: all 0.2s ease;
  text-decoration: none;
}

.choice-card:hover {
  border-color: var(--info);
  box-shadow: 0 10px 40px -10px color-mix(in srgb, var(--info) 30%, transparent);
  transform: translateY(-2px);
}

.card-icon {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.card-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.card-description {
  flex: 1;
  color: var(--text-tertiary);
  font-size: 0.875rem;
  line-height: 1.5;
  margin-bottom: 16px;
}

.card-cta {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--info);
  font-weight: 600;
  font-size: 0.875rem;
}

.choice-card-local:hover {
  border-color: #22c55e;
  box-shadow: 0 10px 40px -10px color-mix(in srgb, #22c55e 30%, transparent);
}

.card-cta-local {
  color: #22c55e;
}

.choice-card-crawl:hover {
  border-color: #10b981;
  box-shadow: 0 10px 40px -10px color-mix(in srgb, #10b981 30%, transparent);
}

.card-cta-crawl {
  color: #10b981;
}
</style>
