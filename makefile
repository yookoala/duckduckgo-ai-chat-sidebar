all: dist/ddg_ai_chat_in_sidebar--firefox.xpi dist/ddg_ai_chat_in_sidebar--chrome.zip

# For upload and distribute to Firefox
dist/ddg_ai_chat_in_sidebar--firefox.xpi: dist/firefox
	cd ./dist/firefox && zip -r ../../$@ ./*
	@echo -e "###############################################################################"
	@echo -e "# Firefox extension package created at dist/ddg_ai_chat_in_sidebar--firefox.xpi"
	@echo -e "###############################################################################\n"

# For upload and distribute to Chrome
dist/ddg_ai_chat_in_sidebar--chrome.zip: dist/chrome
	@echo -e "#######################################################################"
	@echo -e "# Use Chrome or Chromium to package the dist/chrome folder as extension"
	@echo -e "#######################################################################\n"

dist/firefox:
	mkdir -p dist/firefox
	cp -pdf manifest.firefox.json ./dist/firefox/manifest.json
	cp -Rpdf ./src ./*.md ./dist/firefox/.

dist/chrome:
	mkdir -p dist/chrome
	cp -pdf manifest.chrome.json ./dist/chrome/manifest.json
	cp -Rpdf ./src ./*.md ./dist/chrome/.

clean:
	rm -Rf ./dist
	@echo -e "################################"
	@echo -e "# Cleaned up the dist directory."
	@echo -e "################################\n"

test: dist/firefox
	npm ci
	npx playwright install firefox
	npx playwright test

.PHONY: all clean test
