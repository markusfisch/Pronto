BUILD = index.html
ARCHIVE = archive.zip

$(ARCHIVE): $(BUILD)
	zip $@ $^
	@ls -l $@
	@echo "$$((10000000 / 13312 * $$(stat -f '%z' $@) / 100000))%"

$(BUILD): src.js preview.html
	bash squeeze.sh > $(BUILD)

clean:
	rm -f $(BUILD) $(ARCHIVE)

up: $(BUILD)
	scp $(BUILD) manifest.json hhsw.de@ssh.strato.de:sites/proto/js13k2018/
