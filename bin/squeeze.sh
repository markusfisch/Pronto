#!/usr/bin/env bash
while read -r
do
	# embed referenced script
	[[ $REPLY == *\<script\ src=* ]] && {
		SRC=${REPLY#*src=\"}
		SRC=${SRC%%\"*}
		[ -r "$SRC" ] && {
			echo -n '<script>'
			esbuild --minify "$SRC"
			echo -n '</script>'
			continue
		}
	}
	# remove indent
	REPLY=${REPLY##*$'\t'}
	# remove empty lines
	[ "$REPLY" ] || continue
	# keep preprocessor statements on a line
	[[ $REPLY == \#* ]] && {
		echo
		echo "$REPLY"
		continue
	}
	# remove line breaks
	echo -n "$REPLY"
done
