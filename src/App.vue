<template>
    <v-app>
        <v-content>
            <v-overlay :value="loading">
                <v-progress-circular indeterminate></v-progress-circular>
            </v-overlay>

            <v-dialog v-model="banner" persistent max-width="480">
                <v-card>
                    <v-card-title>Error</v-card-title>
                    <v-card-text>
                        MetaMask not installed / detected
                    </v-card-text>
                    <v-card-actions>
                        <v-btn text block color="primary" href="https://metamask.io/" target="_blank">
                            Install
                        </v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>

            <v-dialog v-model="isNotRinkby" persistent max-width="480">
                <v-card>
                    <v-card-title>Error</v-card-title>
                    <v-card-text>
                        Please switch to <b>Rinkby</b> network and reload page
                    </v-card-text>
                    <v-card-actions>
                        <v-btn text block color="primary" @click="reload()">
                            Reload
                        </v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>

            <v-container class="fill-height">
                <v-row class="justify-center align-center">
                    <v-col cols="12" sm="8" md="6" lg="4" xl="3">

                        <h1 class="text-center">
                            <v-icon>mdi-dice-{{dice + 1}}</v-icon>
                            Lottery
                            <v-icon>mdi-dice-{{dice + 1}}</v-icon>
                        </h1>

                        <v-slide-x-reverse-transition>
                            <p v-if="selectedAddress">
                                <b>You:</b>
                                <v-chip>{{selectedAddress}}</v-chip>
                            </p>
                        </v-slide-x-reverse-transition>
                        <v-slide-x-reverse-transition>
                            <p v-if="manager">
                                <b>Manager:</b>
                                <v-chip>{{manager}}</v-chip>
                            </p>
                        </v-slide-x-reverse-transition>
                        <v-slide-x-reverse-transition>
                            <p v-if="players">
                                <b>Players:</b>
                                <span>{{players.length}} Account(s)</span>
                            </p>
                        </v-slide-x-reverse-transition>
                        <v-slide-x-reverse-transition>
                            <p v-if="balance">
                                <b>Prize:</b>
                                <span>{{balance}} Ether</span>
                            </p>
                        </v-slide-x-reverse-transition>

                        <v-slide-y-reverse-transition>
                            <template v-if="selectedAddress">
                                <v-form @submit.prevent="enter" v-model="valid">
                                    <h2 class="py-4">Try your luck</h2>
                                    <v-text-field v-model="amount" label="Amount" type="number"
                                                  append-icon="mdi-ethereum"
                                                  :min="0.011"
                                                  :step="0.001" :disabled="entering" outlined
                                                  :rules="[rules.required, rules.number, rules.minimumRequired]"></v-text-field>
                                    <v-btn color="primary" block large :loading="entering" type="submit"
                                           :disabled="!valid">
                                        Enter
                                    </v-btn>
                                </v-form>
                            </template>
                        </v-slide-y-reverse-transition>

                        <v-slide-y-reverse-transition>>
                            <template v-if="isManager">
                                <v-form @submit.prevent="draw">
                                    <h2 class="py-4">Pick a winner</h2>
                                    <v-btn color="secondary" block large :loading="drawing" type="submit">Draw</v-btn>
                                </v-form>
                            </template>
                        </v-slide-y-reverse-transition>
                    </v-col>
                </v-row>
            </v-container>

            <v-snackbar v-model="snackbar" :color="color">
                {{message}}
                <v-spacer></v-spacer>
                <v-btn icon @click="snackbar = false">
                    <v-icon>mdi-close</v-icon>
                </v-btn>
            </v-snackbar>
        </v-content>
    </v-app>
</template>

<script>
    import Web3 from 'web3';

    const contractAddress = '0x725d0964d6cBAf30da6e916a78183f423F9015E5';

    const contractABI = [
        {
            "constant": false,
            "inputs": [],
            "name": "draw",
            "outputs": [],
            "payable": false,
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "constant": false,
            "inputs": [],
            "name": "enter",
            "outputs": [],
            "payable": true,
            "stateMutability": "payable",
            "type": "function"
        },
        {
            "inputs": [],
            "payable": false,
            "stateMutability": "nonpayable",
            "type": "constructor"
        },
        {
            "constant": true,
            "inputs": [],
            "name": "getManager",
            "outputs": [
                {
                    "name": "",
                    "type": "address"
                }
            ],
            "payable": false,
            "stateMutability": "view",
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [],
            "name": "getPlayers",
            "outputs": [
                {
                    "name": "",
                    "type": "address[]"
                }
            ],
            "payable": false,
            "stateMutability": "view",
            "type": "function"
        }
    ];

    export default {
        data: () => ({
            dice: 0,

            loading: false,
            banner: false,
            web3: undefined,
            contract: undefined,
            selectedAddress: '',
            isNotRinkby: false,
            manager: '',

            snackbar: false,
            message: '',
            color: '',

            players: undefined,
            balance: '',
            amount: '0.011',

            entering: false,
            drawing: false,

            rules: {
                required: value => !!value || 'Required',
                minimumRequired: value => Number(value) > 0.01 || 'Minimum wage is 0.01 ether',
                number: value => !isNaN(value) || 'Invalid input'
            },
            valid: true
        }),
        computed: {
            isManager: function () {
                return this.selectedAddress && this.manager && parseInt(this.selectedAddress) === parseInt(this.manager)
            }
        },
        mounted: async function () {
            setInterval(this.diceUp, 200);
            this.loading = true;
            try {
                if (typeof window.ethereum === 'undefined' && typeof window.web3 === 'undefined') {
                    this.banner = true;
                    return
                }

                const provider = window['ethereum'] || window.web3.currentProvider;
                await provider.enable();

                if (provider.networkVersion !== '4') {
                    this.isNotRinkby = true;
                    return
                }

                this.web3 = new Web3(provider);
                this.contract = new this.web3.eth.Contract(contractABI, contractAddress);

                this.selectedAddress = provider.selectedAddress;
                this.manager = await this.contract.methods.getManager().call();

                await this.getInfo();

                let vm = this;
                provider.on('accountsChanged', function () {
                    vm.selectedAddress = provider.selectedAddress;
                })
            } catch (e) {
                this.showMessage(e, 'error')
            } finally {
                this.loading = false;
            }
        },
        methods: {
            diceUp: function () {
                this.dice = (this.dice + 1) % 6;
            },
            reload: function () {
                location.reload();
            },
            showMessage(message, color = 'info') {
                this.message = message;
                this.color = color;
                this.snackbar = true;
            },
            getInfo: async function () {
                this.players = await this.contract.methods.getPlayers().call();
                this.balance = this.web3.utils.fromWei(await this.web3.eth.getBalance(this.contract.options.address), 'ether');
            },
            enter: async function () {
                this.entering = true;
                try {
                    await this.contract.methods.enter().send({
                        from: this.selectedAddress,
                        value: this.web3.utils.toWei(this.amount, 'ether')
                    });
                    await this.getInfo();
                    this.showMessage('You entered to the pool successfully', 'success')
                } catch (e) {
                    this.showMessage(e, 'error')
                } finally {
                    this.entering = false
                }
            },
            draw: async function () {
                this.drawing = true;
                try {
                    await this.contract.methods.draw().send({
                        from: this.selectedAddress
                    });
                    await this.getInfo();
                    this.showMessage('You picked a winner successfully', 'success')
                } catch (e) {
                    this.showMessage(e, 'error')
                } finally {
                    this.drawing = false
                }
            }
        }

    }
</script>
