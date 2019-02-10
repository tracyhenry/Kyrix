# source this to create this function

# example:
# until work_done; do
#    spin
#    some_work ...
# done
# endspin

# https://stackoverflow.com/a/3330834
sp="/-\|"
sc=0
spin_msg_printed=0
spin() {
    if (( spin_msg_printed == 0 )); then
	printf "$1...  "
	spin_msg_printed=1
    else
	printf "\b${sp:sc++:1}"
	((sc==${#sp})) && sc=0
    fi
    sleep 1
}
endspin() {
    spin_msg_printed=0
    printf "\r%s\n" "$@"
}

