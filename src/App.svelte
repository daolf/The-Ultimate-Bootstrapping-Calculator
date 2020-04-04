<script>
    let monthly_income = 4000;
    let monthly_outflow = 3500;
	let savings = 1000;
	let annual_raise = 5;
	let month_to_first_dollar = 3;
	let arpa = 30;
	let cost_per_customer = 10;
	let fixed_cost = 1000;
	let mth_growth = 5;
	let churn = 2;
	let ownership = 100;
	let valuation_multiple = 10;
	let valuation_metric = "arpa";
	let valuation;

	let compute_valuation = function() {
        valuation = valuation_multiple * eval(valuation_metric);
    };

    compute_valuation()

</script>

<style lang="text/postcss">

</style>

<main>
    <div class="min-h-64 grid grid-rows-1 grid-flow-col gap-4">
        <div class="border-2 rounded-lg border-indigo-500 px-5">
            <h5>Current Situation: </h5>
            <label>
                <div class="flex">
                    <span class="text-gray-700">📈 Monthly Income:</span>
                    <span>
                        <input class="w-auto" type=number bind:value={monthly_income} min="100" max="100000">
                        $
                    </span>
                </div>
                <input class="mt-1 block w-full" type=range bind:value={monthly_income} min=100 max=100000>
            </label>
            <label>
                <div class="flex">
                    <span class="text-gray-700">📉 Monthly Outflow:</span>
                    <span>
                        <input class="w-auto" type=number bind:value={monthly_outflow} min="100" max="100000">
                        $
                    </span>
                </div>
                <input class="mt-1 block w-full" type=range bind:value={monthly_outflow} min=100 max=100000>
            </label>
            <label>
                <div class="flex">
                    <span class="text-gray-700">🤓 Avg Annual Raise:</span>
                    <span>
                        <input class="w-auto" type=number bind:value={annual_raise} min="0" max="100">
                        %
                    </span>
                </div>
                <input class="mt-1 block w-full" type=range bind:value={annual_raise} min=0 max=10000000>
            </label>
            <label>
                <div class="flex">
                    <span class="text-gray-700">💰 Savings:</span>
                    <span>
                        <input class="w-auto" type=number bind:value={savings} min=0 max=10000000>
                        $
                    </span>
                </div>
                <input class="mt-1 block w-full" type=range bind:value={savings} min=0 max=10000000>
            </label>
        </div>
        <div class="border-2 rounded-lg border-green-500 px-5">
            <h5> Revenue Prevision: </h5>
            <label>
                <div class="flex">
                    <span class="text-gray-700">📅 Month until first customer:</span>
                    <span>
                        <input class="w-auto" type=number bind:value={month_to_first_dollar} min=0 max=24>
                    </span>
                </div>
                <input class="mt-1 block w-full" type=range bind:value={month_to_first_dollar} min=0 max=24>
            </label>
            <label>
                <div class="flex">
                    <span class="text-gray-700">⬇️ Monthly Revenue per Customer:</span>
                    <span>
                        <input class="w-auto" type=number bind:value={arpa} on:change="{compute_valuation}" min=0 max=1000>
                        $
                    </span>
                </div>
                <input class="mt-1 block w-full" type=range bind:value={arpa} on:change="{compute_valuation}" min=0 max=1000>
            </label>
            <label>
                <div class="flex">
                    <span class="text-gray-700">⬆️ Monthly Cost per Customer:</span>
                    <span>
                        <input class="w-auto" type=number bind:value={cost_per_customer} on:change="{compute_valuation}" min=0 max=1000>
                        $
                    </span>
                </div>
                <input class="mt-1 block w-full" type=range bind:value={cost_per_customer} on:change="{compute_valuation}" min=0 max=1000>
            </label>
            <label>
                <div class="flex">
                    <span class="text-gray-700">💸 Fixed Monthly Cost:</span>
                    <span>
                        <input class="w-auto" type=number bind:value={fixed_cost} min=0 max=100000>
                        $
                    </span>
                </div>
                <input class="mt-1 block w-full" type=range bind:value={fixed_cost} min=0 max=100000>
            </label>
            <label>
                <div class="flex">
                    <span class="text-gray-700">🚀 Monthly Growth:</span>
                    <span>
                        <input class="w-auto" type=number bind:value={mth_growth} min=0 max=100>
                        %
                    </span>
                </div>
                <input class="mt-1 block w-full" type=range bind:value={mth_growth} min=0 max=100>
            </label>
            <label>
                <div class="flex">
                    <span class="text-gray-700">💔 Monthly Churn:</span>
                    <span>
                        <input class="w-auto" type=number bind:value={churn} min=0 max=100>
                        %
                    </span>
                </div>
                <input class="mt-1 block w-full" type=range bind:value={churn} min=0 max=100>
            </label>
        </div>
        <div class="border-2 rounded-lg border-red-500 px-5">
            <h5> Equity: </h5>
            <label class="block">
                <div class="flex">
                    <span class="text-gray-700">😎 Ownership:</span>
                    <span>
                        <input class="w-auto" type=number bind:value={ownership} min=0 max=100>
                        %
                    </span>
                </div>
                <input class="mt-1 block w-full" type=range bind:value={ownership} min=0 max=100>
            </label>
            <label class="block">
                <div class="flex mb-5">
                    <span class="text-gray-700">🤞 Valuation: </span>
                    <span> {valuation}$ </span>
                </div>
                <div class="flex">
                    <input class="w-auto" type=number bind:value={valuation_multiple} on:change="{compute_valuation}" min=0 max=100>
                    ⨉
                    <select class="p-8" bind:value={valuation_metric} on:change="{compute_valuation}">
                        <option value={"arpa"}>
                            Monthly Recuring Revenue
                        </option>
                        <option value={"arpa - cost_per_customer"}>
                            Monthly Margin
                        </option>
                    </select>
                </div>
            </label>
        </div>
    </div>
</main>
