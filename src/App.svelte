<script>
    import Chart from 'chart.js';
    Chart.defaults.global.defaultFontFamily = '-apple-system,system-ui,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif';
    Chart.defaults.global.defaultFontSize = 17;
    import { onMount } from 'svelte';

    let monthly_income = 4000;
    let monthly_outflow = 2500;
	let savings = 1000;
	let annual_raise = 5;
	let month_to_first_dollar = 3;
	let arpa = 30;
	let cost_per_customer = 5;
    let number_of_customer_first_month = 10;
	let fixed_cost = 100;
	let growth = 12;
	let churn = 0;
	let ownership = 100;
	let part_of_revenue_income = 100;
	let valuation_multiple = 20;
	let valuation_metric = "arpa";
	let equity;
	let canvas;
	let chart = null;

	let saving_data_points  = [];
	let old_income_data_points = [];
	let new_income_data_points = [];
	let equity_data_points = [];

	$: {
	    equity = Math.floor(ownership / 100 * valuation_multiple * number_of_customer_first_month * ((valuation_metric=="arpa") ? arpa : arpa - cost_per_customer));
	    saving_data_points.splice(0, saving_data_points.length);
	    old_income_data_points.splice(0, old_income_data_points.length);
        new_income_data_points.splice(0, new_income_data_points.length);
        equity_data_points.splice(0, equity_data_points.length);
        let last_month_savings = savings;
        let monthly_raise = annual_raise / 12;

	    for (let i=0; i<=36; i++) {

	        let income = monthly_income * Math.pow( 1 + monthly_raise / 100, i);
            saving_data_points.push(Math.floor(last_month_savings + ( income - monthly_outflow)));
            last_month_savings += ( income - monthly_outflow);
            old_income_data_points.push(Math.floor(income));

            let new_number_of_customer = (number_of_customer_first_month * Math.pow( 1 + growth / 100, i) * Math.pow( 1 - churn / 100, i));
            let current_month_revenue = (part_of_revenue_income / 100) * (new_number_of_customer * (arpa - cost_per_customer) - fixed_cost);
            new_income_data_points.push(Math.floor(current_month_revenue - monthly_outflow));

            let new_equity = ownership / 100 * valuation_multiple * new_number_of_customer * ((valuation_metric=="arpa") ? arpa : arpa - cost_per_customer);
            equity_data_points.push(Math.floor(new_equity))
        }

        (chart) ? chart.update() : null;
    }

	onMount(async() => {
	    renderChart(saving_data_points, old_income_data_points, new_income_data_points, equity_data_points);
    });

    function renderChart(saving_data_points, income_data_point, net_revenue_data_points, equity_data_points) {
        (chart) ? chart.destroy() : null;
        let labels = [];
        for (let i=1; i<saving_data_points.length; i++) {labels.push(i)}
        if (canvas) {
            var ctx = canvas.getContext('2d');
            var data = {
                labels : labels,
                datasets : [
                    {
                        label: "Savings w/current job",
                        backgroundColor: "#667eea",
                        borderColor: "#667eea",
                        data: saving_data_points,
                        fill: false
                    },
                    {
                        label: "Net income w/current job",
                        backgroundColor: "#000aea",
                        borderColor: "#000aea",
                        data: old_income_data_points,
                        fill: false
                    },
                    {
                        label: "Net income w/new project",
                        backgroundColor: "#48bb78",
                        borderColor: "#48bb78",
                        data: net_revenue_data_points,
                        fill: false
                    },
                    {
                        label: "Equity",
                        backgroundColor: "#f56565",
                        borderColor: "#f56565",
                        data: equity_data_points,
                        fill: false,
                        borderDash: [8,3],
                    }
                ]
            };
            chart = new Chart(ctx, {
                type: 'line',
                data: data,
                options: {
                    animation: false,
                    legend: {
                        position: 'bottom',
                    },
                    scales: {
                        xAxes: [{
                            scaleLabel: {
                                display: true,
                                labelString: "Number of month from now"
                            },
                            gridLines: {display: false}
                        }],
                        yAxes: [{
                            scaleLabel: {
                                display: true,
                                labelString: "Amount in $"
                            },
                            gridLines: {display: false}}],
                    },
                    tooltips: {
                        intersect: true,
                        mode: 'nearest'
                    },
                    elements: {
                        point:{
                            radius: 3
                        }
                    }
                },
            });

        }
    }

</script>

<style lang="text/postcss">

</style>

<main>
    <div class="grid grid-cols-12 gap-4">
        <div class="col-span-12 md:col-span-4">
            <div class="border-2 rounded-lg border-indigo-500 px-5 mb-5">
                <h5>Current Situation: </h5>
                <label>
                    <div class="flex">
                        <span class="text-gray-700">📈Income:</span>
                        <span>
                        <input class="w-auto" type=number bind:value={monthly_income} min="100" max="100000">
                        $/mo
                    </span>
                    </div>
                </label>
                <label>
                    <div class="flex">
                        <span class="text-gray-700">📉Outflow:</span>
                        <span>
                        <input class="w-auto" type=number bind:value={monthly_outflow} min="100" max="100000">
                        $/mo
                    </span>
                    </div>
                </label>
                <label>
                    <div class="flex">
                        <span class="text-gray-700">🤓 Avg Annual Raise:</span>
                        <span>
                        <input class="w-auto" type=number bind:value={annual_raise} min="0" max="100">
                        %
                    </span>
                    </div>
                </label>
                <label>
                    <div class="flex">
                        <span class="text-gray-700">💰 Savings:</span>
                        <span>
                        <input class="w-auto" type=number bind:value={savings} min=0 max=1000000>
                        $
                    </span>
                    </div>
                </label>
            </div>
            <div class="border-2 rounded-lg border-green-500 px-5 mb-5">
                <h5> Revenue Prevision: </h5>
                <label>
                    <div class="flex">
                        <span class="text-gray-700">📅 Month until first customer:</span>
                        <span>
                        <input class="w-auto" type=number bind:value={month_to_first_dollar} min=0 max=24>
                    </span>
                    </div>
                </label>
                <label>
                    <div class="flex">
                        <span class="text-gray-700">🤝 Number of customers first month:</span>
                        <span>
                        <input class="w-auto" type=number bind:value={number_of_customer_first_month} min=0 max=100>
                    </span>
                    </div>
                </label>
                <label>
                    <div class="flex">
                        <span class="text-gray-700">⬇️ Revenue per Customer:</span>
                        <span>
                        <input class="w-auto" type=number bind:value={arpa} min=0 max=1000>
                        $/mo
                    </span>
                    </div>
                    <input class="mt-1 block w-full" type=range bind:value={arpa} min=0 max=1000>
                </label>
                <label>
                    <div class="flex">
                        <span class="text-gray-700">⬆️ Cost per Customer:</span>
                        <span>
                        <input class="w-auto" type=number bind:value={cost_per_customer} min=0 max=1000>
                        $/mo
                    </span>
                    </div>
                    <input class="mt-1 block w-full" type=range bind:value={cost_per_customer} min=0 max=1000>
                </label>
                <label>
                    <div class="flex">
                        <span class="text-gray-700">💸 Fixed Cost:</span>
                        <span>
                        <input class="w-auto" type=number bind:value={fixed_cost} min=0 max=100000>
                        $/mo
                    </span>
                    </div>
                </label>
                <label>
                    <div class="flex">
                        <span class="text-gray-700">🚀 Growth:</span>
                        <span>
                        <input class="w-auto" type=number bind:value={growth} min=0 max=100>
                        %/mo
                    </span>
                    </div>
                    <input class="mt-1 block w-full" type=range bind:value={growth} min=0 max=100>
                </label>
                <label>
                    <div class="flex">
                        <span class="text-gray-700">💔 Churn:</span>
                        <span>
                        <input class="w-auto" type=number bind:value={churn} min=0 max=100>
                        %/mo
                    </span>
                    </div>
                    <input class="mt-1 block w-full" type=range bind:value={churn} min=0 max=100>
                </label>
                <label>
                    <div class="flex">
                        <span class="text-gray-700">👛 Part of net revenue in salary:</span>
                        <span>
                        <input class="w-auto" type=number bind:value={part_of_revenue_income} min=0 max=100>
                        %
                    </span>
                    </div>
                </label>
            </div>
            <div class="border-2 rounded-lg border-red-500 px-5 mb-5">
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
                        <span class="text-gray-700">🤞 Calculation Method </span>
                    </div>
                    <div class="flex">
                        <input class="w-auto" type=number bind:value={valuation_multiple} min=0 max=100>
                        ⨉
                        <div class="relative">
                            <select bind:value={valuation_metric}>
                                <option value={"arpa"}>
                                    Monthly Revenue
                                </option>
                                <option value={"arpa - cost_per_customer"}>
                                    Monthly Margin
                                </option>
                            </select>
                            <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                <svg class="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                            </div>
                        </div>
                    </div>
                    <div class="text-center mt-4">
                        <span> = {equity}$ (for first month) </span>
                    </div>
                </label>
            </div>
        </div>
        <div class="col-span-12 md:col-span-8">
            <div class="border-2 rounded-lg border-yellow-500 px-5 sticky top-10">
                <h5>Projection: </h5>
                <canvas bind:this={canvas} width="400" height="200"></canvas>
            </div>
        </div>
    </div>
    <div class="min-h-64 grid grid-rows-1 grid-flow-col gap-4">

    </div>
    <div class="min-h-64 grid grid-rows-1 grid-flow-col gap-4 mt-5">

    </div>
</main>
