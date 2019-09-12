import Vue from 'vue'
import vuetify from "./plugins/vuetify.js";
import App from './App.vue';

new Vue({
    el: '#app',
    vuetify,
    render: h => h(App)
});
