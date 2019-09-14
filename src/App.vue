<template>
    <v-app>
        <v-content>
            <v-container class="fill-height">
                <v-row class="justify-center align-center">
                    <v-col cols="12" sm="8" md="6" lg="4" xl="3">

                        <h1 class="text-center">
                            <v-icon>mdi-dice-5</v-icon>
                            Lottery
                            <v-icon>mdi-dice-6</v-icon>
                        </h1>

                        <v-banner single-line v-model="banner">
                            MetaMask not installed / detected
                            <template v-slot:actions>
                                <v-btn text color="primary" href="https://metamask.io/" target="_blank">
                                    Install
                                </v-btn>
                            </template>
                        </v-banner>

                        <v-select v-if="!banner" :items="accounts" v-model="defaultAccount" label="Account"
                                  placeholder="Select an account" :loading="loading" outlined></v-select>

                        <template v-if="defaultAccount">
                            <p><b>Manager:</b>
                                <v-chip>{{manager}}</v-chip>
                            </p>
                            <p><b>Players:</b> {{players.length}} Account(s)</p>
                            <p><b>Balance:</b> {{balance}} Ether</p>
                        </template>

                        <template v-if="defaultAccount">
                            <v-form @submit.prevent="enter" v-model="valid">
                                <h2 class="py-4">Try your luck</h2>
                                <v-text-field v-model="amount" label="Amount" type="number" append-icon="mdi-ethereum"
                                              :min="0.011"
                                              :step="0.001" :disabled="entering" outlined
                                              :rules="[rules.required, rules.number, rules.minimumRequired]"></v-text-field>
                                <v-btn color="primary" block large :loading="entering" type="submit" :disabled="!valid">
                                    Enter
                                </v-btn>
                            </v-form>
                        </template>

                        <template v-if="defaultAccount && manager && defaultAccount === manager">
                            <v-form @submit.prevent="draw">
                                <h2 class="py-4">Pick a winner</h2>
                                <v-btn color="secondary" block large :loading="drawing" type="submit">Draw</v-btn>
                            </v-form>
                        </template>
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

    // const address = '0xb83Fe8DE9a3E1f2385F40f24141B1cAF5A111f3f';
    const contractAddress = '0x279B78A4A66d9883782f5553c5B2444d1189E4b9';

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
            web3: undefined,
            banner: false,
            snackbar: false,
            message: '',
            color: '',
            accounts: [],
            loading: false,
            defaultAccount: '',
            contract: undefined,
            manager: '',
            players: [],
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
        watch: {
            defaultAccount: function () {
                this.web3.eth.defaultAccount = this.defaultAccount;
            }
        },
        mounted: async function () {
            this.loading = true;
            try {
                if (!window.web3) {
                    this.banner = true;
                    return
                }
                window.web3.currentProvider.enable();
                this.web3 = new Web3(window.web3.currentProvider);
                this.contract = new this.web3.eth.Contract(contractABI, contractAddress);
                this.accounts = await this.web3.eth.getAccounts();
                this.manager = await this.contract.methods.getManager().call();
                await this.getInfo()
            } catch (e) {
                this.showMessage(e, 'error')
            } finally {
                this.loading = false;
            }
        },
        methods: {
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
                        from: this.defaultAccount,
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
                        from: this.defaultAccount
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
