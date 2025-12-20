# Makefile for Lighthouse LLM Analyzer
# Vue.js + Vite + Tailwind CSS v4

.PHONY: help install dev start stop build preview clean lint test test-coverage test-watch

# Default target
help:
	@echo "Lighthouse LLM Analyzer - Available commands:"
	@echo ""
	@echo "  make install    - Install dependencies"
	@echo "  make dev        - Start development server"
	@echo "  make start      - Start development server (alias)"
	@echo "  make stop       - Stop development server"
	@echo "  make build      - Build for production"
	@echo "  make preview    - Preview production build"
	@echo "  make clean      - Clean build artifacts"
	@echo "  make lint       - Run linter"
	@echo "  make test       - Run tests"
	@echo "  make test-coverage - Run tests with coverage"
	@echo "  make test-watch - Run tests in watch mode"
	@echo ""

# Install dependencies
install:
	npm install

# Start development server
dev:
	@echo "Starting development server..."
	@npm run dev & echo $$! > .dev.pid
	@echo "Dev server started (PID: $$(cat .dev.pid))"
	@echo "Access: http://localhost:5173"

# Alias for dev
start: dev

# Stop development server
stop:
	@if [ -f .dev.pid ]; then \
		PID=$$(cat .dev.pid); \
		if ps -p $$PID > /dev/null 2>&1; then \
			echo "Stopping dev server (PID: $$PID)..."; \
			kill $$PID 2>/dev/null || true; \
			pkill -f "vite" 2>/dev/null || true; \
			rm -f .dev.pid; \
			echo "Dev server stopped."; \
		else \
			echo "Dev server not running (stale PID file)."; \
			rm -f .dev.pid; \
		fi \
	else \
		echo "Stopping any running Vite processes..."; \
		pkill -f "vite" 2>/dev/null || echo "No Vite process found."; \
	fi

# Build for production
build:
	@echo "Building for production..."
	npm run build
	@echo "Build complete. Output in dist/"

# Preview production build
preview:
	@echo "Starting preview server..."
	npm run preview

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	rm -rf dist
	rm -rf node_modules/.vite
	rm -f .dev.pid
	@echo "Clean complete."

# Run linter
lint:
	@echo "Running linter..."
	npm run lint 2>/dev/null || echo "No lint script configured"

# Run tests
test:
	@echo "Running tests..."
	npm run test:run

# Run tests with coverage
test-coverage:
	@echo "Running tests with coverage..."
	npm run test:coverage

# Run tests in watch mode
test-watch:
	@echo "Running tests in watch mode..."
	npm run test

# Status check
status:
	@if [ -f .dev.pid ]; then \
		PID=$$(cat .dev.pid); \
		if ps -p $$PID > /dev/null 2>&1; then \
			echo "Dev server is running (PID: $$PID)"; \
			echo "Access: http://localhost:5173"; \
		else \
			echo "Dev server is not running (stale PID file)"; \
		fi \
	else \
		if pgrep -f "vite" > /dev/null; then \
			echo "Vite process found but not managed by Makefile"; \
		else \
			echo "Dev server is not running"; \
		fi \
	fi

# Restart development server
restart: stop dev
