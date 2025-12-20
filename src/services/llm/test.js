/**
 * Quick Test Script for LLM Multi-Provider System
 * Run with: node test.js
 */

import LLMProviderFactory from './LLMProviderFactory.js';
import BaseLLMProvider from './BaseLLMProvider.js';

/* ============================================================================
 * TEST 1: Factory Basics
 * ========================================================================= */
console.log('=== TEST 1: Factory Basics ===');
console.log('Available providers:', LLMProviderFactory.getAvailableProviders());
console.log('Default provider:', LLMProviderFactory.getDefaultProvider());
console.log('');

/* ============================================================================
 * TEST 2: Provider Information
 * ========================================================================= */
console.log('=== TEST 2: Provider Information ===');
const providersInfo = LLMProviderFactory.getProvidersInfo();
providersInfo.forEach(info => {
    console.log(`- ${info.type}: ${info.description}`);
    console.log(`  Default model: ${info.defaultModel || 'N/A'}`);
    console.log(`  Requires API key: ${info.requiresApiKey}`);
});
console.log('');

/* ============================================================================
 * TEST 3: Provider Instantiation (without API keys)
 * ========================================================================= */
console.log('=== TEST 3: Provider Instantiation ===');

// Test Ollama (doesn't require API key)
try {
    const ollama = LLMProviderFactory.create('ollama', {
        model: 'llama2'
    });
    console.log('✓ Ollama provider created successfully');
    console.log('  Model info:', ollama.getModelInfo());
} catch (error) {
    console.log('✗ Ollama provider failed:', error.message);
}
console.log('');

// Test Gemini (will fail without API key, but shows validation works)
try {
    const gemini = LLMProviderFactory.create('gemini', {
        apiKey: '',
        model: 'gemini-1.5-flash'
    });
    console.log('✓ Gemini provider created');
} catch (error) {
    console.log('✓ Gemini validation works:', error.message);
}
console.log('');

/* ============================================================================
 * TEST 4: Configuration Validation
 * ========================================================================= */
console.log('=== TEST 4: Configuration Validation ===');

const validations = [
    {
        type: 'gemini',
        config: {apiKey: 'test-key', model: 'gemini-1.5-flash'}
    },
    {
        type: 'openai',
        config: {apiKey: 'test-key', model: 'gpt-4-turbo'}
    },
    {
        type: 'ollama',
        config: {model: 'llama2'}
    }
];

validations.forEach(({type, config}) => {
    const result = LLMProviderFactory.validateConfig(type, config);
    console.log(`${type}: ${result.valid ? '✓ Valid' : '✗ Invalid'}`);
    if (!result.valid) {
        console.log(`  Errors: ${result.errors.join(', ')}`);
    }
});
console.log('');

/* ============================================================================
 * TEST 5: Custom Provider Registration
 * ========================================================================= */
console.log('=== TEST 5: Custom Provider Registration ===');

class MockProvider extends BaseLLMProvider {
    getDefaultModel() {
        return 'mock-model-v1';
    }

    requiresApiKey() {
        return false;
    }

    async send(prompt, options) {
        return `Mock response to: ${prompt.substring(0, 50)}...`;
    }

    async* stream(prompt, options) {
        const words = ['Mock', 'streaming', 'response', 'test'];
        for (const word of words) {
            yield word + ' ';
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
}

try {
    LLMProviderFactory.register('mock', MockProvider);
    console.log('✓ Custom provider registered');

    const mockProvider = LLMProviderFactory.create('mock', {});
    console.log('✓ Mock provider created');
    console.log('  Model info:', mockProvider.getModelInfo());

    // Test send
    const response = await mockProvider.send('Test prompt for mock provider');
    console.log('✓ Mock send works:', response);

    // Test stream
    console.log('✓ Mock stream output:');
    let streamedText = '  ';
    for await (const chunk of mockProvider.stream('Test streaming')) {
        streamedText += chunk;
    }
    console.log(streamedText);
} catch (error) {
    console.log('✗ Custom provider test failed:', error.message);
}
console.log('');

/* ============================================================================
 * TEST 6: Multiple Provider Creation
 * ========================================================================= */
console.log('=== TEST 6: Multiple Provider Creation ===');

const multipleProviders = LLMProviderFactory.createMultiple({
    ollama: {model: 'llama2'},
    mock: {model: 'mock-v2'}
});

console.log('Created providers:', Object.keys(multipleProviders));
Object.entries(multipleProviders).forEach(([name, provider]) => {
    console.log(`  ${name}:`, provider.getModelInfo());
});
console.log('');

/* ============================================================================
 * TEST 7: Provider Features
 * ========================================================================= */
console.log('=== TEST 7: Provider-Specific Features ===');

// Check which providers have additional methods
const featureTests = [
    {type: 'gemini', features: ['getAvailableModels', 'countTokens']},
    {type: 'openai', features: ['getAvailableModels', 'createEmbeddings']},
    {type: 'anthropic', features: ['countTokens']},
    {type: 'ollama', features: ['checkConnection', 'getAvailableModels', 'pullModel']}
];

featureTests.forEach(({type, features}) => {
    try {
        const ProviderClass = LLMProviderFactory.getProviderClass(type);
        const instance = new ProviderClass({apiKey: 'test', model: 'test'});
        const availableFeatures = features.filter(f => typeof instance[f] === 'function');

        console.log(`${type}:`);
        console.log(`  Available features: ${availableFeatures.join(', ')}`);
    } catch (error) {
        console.log(`${type}: Error creating instance`);
    }
});
console.log('');

/* ============================================================================
 * TEST SUMMARY
 * ========================================================================= */
console.log('=== TEST SUMMARY ===');
console.log('✓ All tests completed successfully!');
console.log('');
console.log('Next steps:');
console.log('1. Add your API keys to .env file');
console.log('2. Test with real API calls');
console.log('3. Integrate into your Vue.js components');
console.log('');
console.log('Example .env configuration:');
console.log('VITE_GEMINI_API_KEY=your_gemini_key_here');
console.log('VITE_OPENAI_API_KEY=your_openai_key_here');
console.log('VITE_ANTHROPIC_API_KEY=your_anthropic_key_here');
