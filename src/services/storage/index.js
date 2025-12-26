
const getKey = (key) => {
    return window.localStorage.getItem(key)
}
const getServerSideCookie = (req, key) => {
    if (req.cookies[key]) {
        return req.cookies[key]
    }
    else {
        return 'undefined'
    }
}
const removeKey = (key) => {
    window.localStorage.removeItem(key)
}

const setKey = (key, value) => {
    window.localStorage.setItem(key, value)
}

export { getKey, setKey, getServerSideCookie, removeKey };