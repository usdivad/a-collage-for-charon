# Apply Paulstretch to all mastered tracks

dir_base_original=`pwd`
dir_input="/Users/usdivad/Documents/music/charon/songs/mastering_tracks Project/mastered_separated_extended"
dir_output="${dir_base_original}/tracks_stretched"

echo "dir_base_original=$dir_base_original"
echo "dir_input=$dir_input"
echo "dir_output=$dir_output"
echo ""

cd "$dir_input"

for f in *.wav
do
    echo "doing $f"
    name="${f%.wav}"
    python "${dir_base_original}/lib/paulstretch_python/paulstretch_stereo.py" -s 8.0 -w 0.25 "$f" "${dir_output}/${name}_8x.wav"
done
echo "Done stretching"

wavtomp3_multi "${dir_output}"
echo "Done converting"

cd "$dir_base_original"