BIN_DIR := ./bin

all: | $(BIN_DIR)
	$(MAKE) turn_on_test
	$(MAKE) turn_off_test

clean:
	rm -rf $(BIN_DIR)

turn_on_test: | $(BIN_DIR)
	gcc ./src/turn_on_extreme_cooling.c -o ./bin/turn_on_test

turn_off_test: | $(BIN_DIR)
	gcc ./src/turn_off_extreme_cooling.c -o ./bin/turn_off_test

$(BIN_DIR):
	mkdir -p $(BIN_DIR)