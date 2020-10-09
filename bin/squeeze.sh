#!/usr/bin/env bash
embed() {
	while read -r
	do
		[[ $REPLY == '<script src="src.js"></script>' ]] && {
			echo '<script>'
			closurecompiler < src.js
			echo '</script>'
			continue
		}
		# skip comments
		REPLY=${REPLY%%//*}
		# skip indent
		REPLY=${REPLY##*$'\t'}
		# skip empty lines
		[ "$REPLY" ] || continue
		echo "$REPLY"
	done
}
embed < preview.html
