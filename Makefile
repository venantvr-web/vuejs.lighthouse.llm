# Makefile for Lighthouse LLM Analyzer
# Vue.js + Vite + Tailwind CSS v4

.PHONY: help install dev start stop build preview clean lint test test-coverage test-watch
.PHONY: lighthouse-install lighthouse-start lighthouse-stop lighthouse-status lighthouse-restart
.PHONY: start-all stop-all restart-all status-all

# Variables
LIGHTHOUSE_PORT ?= 3001

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
	@echo "Lighthouse Local Server:"
	@echo "  make lighthouse-install - Install Lighthouse server dependencies"
	@echo "  make lighthouse-start   - Start Lighthouse server"
	@echo "  make lighthouse-stop    - Stop Lighthouse server"
	@echo "  make lighthouse-status  - Check Lighthouse server status"
	@echo "  make lighthouse-restart - Restart Lighthouse server"
	@echo ""
	@echo "All Services:"
	@echo "  make start-all   - Start dev server + Lighthouse server"
	@echo "  make stop-all    - Stop all servers"
	@echo "  make restart-all - Restart all servers"
	@echo "  make status-all  - Check all servers status"
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

# ===== Lighthouse Local Server =====

# Install Lighthouse server dependencies
lighthouse-install:
	@echo "Installing Lighthouse server dependencies..."
	cd server && npm install
	@echo "Lighthouse server dependencies installed."

# Start Lighthouse server
lighthouse-start:
	@echo "Starting Lighthouse server on port $(LIGHTHOUSE_PORT)..."
	@cd server && LIGHTHOUSE_PORT=$(LIGHTHOUSE_PORT) npm start & echo $$! > ../.lighthouse.pid
	@sleep 2
	@echo "Lighthouse server started (PID: $$(cat .lighthouse.pid))"
	@echo "Access: http://localhost:$(LIGHTHOUSE_PORT)"
	@echo "Health: http://localhost:$(LIGHTHOUSE_PORT)/health"

# Stop Lighthouse server
lighthouse-stop:
	@if [ -f .lighthouse.pid ]; then \
		PID=$$(cat .lighthouse.pid); \
		if ps -p $$PID > /dev/null 2>&1; then \
			echo "Stopping Lighthouse server (PID: $$PID)..."; \
			kill $$PID 2>/dev/null || true; \
			rm -f .lighthouse.pid; \
			echo "Lighthouse server stopped."; \
		else \
			echo "Lighthouse server not running (stale PID file)."; \
			rm -f .lighthouse.pid; \
		fi \
	else \
		echo "No Lighthouse server PID file found."; \
		pkill -f "server/index.js" 2>/dev/null || echo "No server process found."; \
	fi

# Check Lighthouse server status
lighthouse-status:
	@if [ -f .lighthouse.pid ]; then \
		PID=$$(cat .lighthouse.pid); \
		if ps -p $$PID > /dev/null 2>&1; then \
			echo "Lighthouse server is running (PID: $$PID)"; \
			echo "Checking health..."; \
			curl -s http://localhost:$(LIGHTHOUSE_PORT)/health || echo "Health check failed"; \
		else \
			echo "Lighthouse server is not running (stale PID file)"; \
		fi \
	else \
		echo "Lighthouse server is not running"; \
	fi

# Restart Lighthouse server
lighthouse-restart: lighthouse-stop lighthouse-start

# ===== All Services =====

# Start all servers (dev + lighthouse)
start-all: dev lighthouse-start
	@echo ""
	@echo "All services started!"
	@echo "  Frontend: http://localhost:5173"
	@echo "  Lighthouse: http://localhost:$(LIGHTHOUSE_PORT)"

# Stop all servers
stop-all: stop lighthouse-stop
	@echo "All services stopped."

# Restart all servers
restart-all: stop-all
	@sleep 1
	@$(MAKE) start-all

# Check all servers status
status-all: status lighthouse-status
