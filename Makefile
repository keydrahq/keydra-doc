# Keydra documentation.
#
# Every target is a thin front to a script under scripts/, so what CI runs and what a
# contributor runs are the same command. Nothing here hides an error: a failing step fails
# the target.

SHELL := /bin/bash
.DEFAULT_GOAL := help

# yarn comes from Corepack; the Node version is pinned by .nvmrc.
YARN := yarn

.PHONY: help install docs docs-en docs-tr docs-serve docs-pages docs-lint docs-check \
        docs-clean docs-pdf docs-test docs-source-inventory docs-container

help: ## Show this help
	@echo ""
	@echo "  Keydra documentation"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
	  | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-24s\033[0m %s\n", $$1, $$2}'
	@echo ""

install: ## Install the build dependencies
	$(YARN) install --immutable

docs: install ## Build every language and version into dist/
	$(YARN) build

docs-en: install ## Build the English documentation only
	$(YARN) build:en

docs-tr: install ## Build the Turkish documentation only
	$(YARN) build:tr

docs-serve: ## Serve dist/ locally
	@$(YARN) serve

docs-pages: install ## Build and serve exactly as GitHub Pages will
	$(YARN) build --base-path /docs/ --docs-prefix "" --base-url https://keydrahq.github.io
	$(YARN) validate
	@$(YARN) serve --base-path /docs/ --docs-prefix ""

docs-lint: install ## Run Vale over the content
	$(YARN) lint

docs-check: install ## Everything a pull request must pass
	@echo "==> source inventory"
	@$(YARN) inventory
	@echo "==> renderer and build tests"
	@$(YARN) test
	@echo "==> production build"
	@$(YARN) build
	@echo "==> validation"
	@$(YARN) validate
	@echo "==> style"
	@$(YARN) lint

docs-pdf: ## Build the PDFs. Needs a completed `make docs`.
	$(YARN) pdf

docs-test: install ## Run the renderer and build tests
	$(YARN) test

docs-source-inventory: install ## Re-read the Keydra source tree into .generated/
	$(YARN) inventory

docs-clean: ## Remove everything generated
	$(YARN) clean

docs-container: ## Build the container image that serves dist/
	podman build -t localhost/keydra-docs:dev -f Containerfile .
