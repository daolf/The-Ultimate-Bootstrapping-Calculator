
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
(function () {
    'use strict';

    function noop() {}

    function add_location(element, file, line, column, char) {
    	element.__svelte_meta = {
    		loc: { file, line, column, char }
    	};
    }

    function run(fn) {
    	return fn();
    }

    function blank_object() {
    	return Object.create(null);
    }

    function run_all(fns) {
    	fns.forEach(run);
    }

    function is_function(thing) {
    	return typeof thing === 'function';
    }

    function safe_not_equal(a, b) {
    	return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
    	target.appendChild(node);
    }

    function insert(target, node, anchor) {
    	target.insertBefore(node, anchor || null);
    }

    function detach(node) {
    	node.parentNode.removeChild(node);
    }

    function element(name) {
    	return document.createElement(name);
    }

    function text(data) {
    	return document.createTextNode(data);
    }

    function space() {
    	return text(' ');
    }

    function listen(node, event, handler, options) {
    	node.addEventListener(event, handler, options);
    	return () => node.removeEventListener(event, handler, options);
    }

    function attr(node, attribute, value) {
    	if (value == null) node.removeAttribute(attribute);
    	else node.setAttribute(attribute, value);
    }

    function to_number(value) {
    	return value === '' ? undefined : +value;
    }

    function children(element) {
    	return Array.from(element.childNodes);
    }

    function set_data(text, data) {
    	data = '' + data;
    	if (text.data !== data) text.data = data;
    }

    function select_option(select, value) {
    	for (let i = 0; i < select.options.length; i += 1) {
    		const option = select.options[i];

    		if (option.__value === value) {
    			option.selected = true;
    			return;
    		}
    	}
    }

    function select_value(select) {
    	const selected_option = select.querySelector(':checked') || select.options[0];
    	return selected_option && selected_option.__value;
    }

    let current_component;

    function set_current_component(component) {
    	current_component = component;
    }

    const dirty_components = [];

    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];

    function schedule_update() {
    	if (!update_scheduled) {
    		update_scheduled = true;
    		resolved_promise.then(flush);
    	}
    }

    function add_render_callback(fn) {
    	render_callbacks.push(fn);
    }

    function flush() {
    	const seen_callbacks = new Set();

    	do {
    		// first, call beforeUpdate functions
    		// and update components
    		while (dirty_components.length) {
    			const component = dirty_components.shift();
    			set_current_component(component);
    			update(component.$$);
    		}

    		while (binding_callbacks.length) binding_callbacks.shift()();

    		// then, once components are updated, call
    		// afterUpdate functions. This may cause
    		// subsequent updates...
    		while (render_callbacks.length) {
    			const callback = render_callbacks.pop();
    			if (!seen_callbacks.has(callback)) {
    				callback();

    				// ...so guard against infinite loops
    				seen_callbacks.add(callback);
    			}
    		}
    	} while (dirty_components.length);

    	while (flush_callbacks.length) {
    		flush_callbacks.pop()();
    	}

    	update_scheduled = false;
    }

    function update($$) {
    	if ($$.fragment) {
    		$$.update($$.dirty);
    		run_all($$.before_render);
    		$$.fragment.p($$.dirty, $$.ctx);
    		$$.dirty = null;

    		$$.after_render.forEach(add_render_callback);
    	}
    }

    function mount_component(component, target, anchor) {
    	const { fragment, on_mount, on_destroy, after_render } = component.$$;

    	fragment.m(target, anchor);

    	// onMount happens after the initial afterUpdate. Because
    	// afterUpdate callbacks happen in reverse order (inner first)
    	// we schedule onMount callbacks before afterUpdate callbacks
    	add_render_callback(() => {
    		const new_on_destroy = on_mount.map(run).filter(is_function);
    		if (on_destroy) {
    			on_destroy.push(...new_on_destroy);
    		} else {
    			// Edge case - component was destroyed immediately,
    			// most likely as a result of a binding initialising
    			run_all(new_on_destroy);
    		}
    		component.$$.on_mount = [];
    	});

    	after_render.forEach(add_render_callback);
    }

    function destroy(component, detaching) {
    	if (component.$$) {
    		run_all(component.$$.on_destroy);
    		component.$$.fragment.d(detaching);

    		// TODO null out other refs, including component.$$ (but need to
    		// preserve final state?)
    		component.$$.on_destroy = component.$$.fragment = null;
    		component.$$.ctx = {};
    	}
    }

    function make_dirty(component, key) {
    	if (!component.$$.dirty) {
    		dirty_components.push(component);
    		schedule_update();
    		component.$$.dirty = blank_object();
    	}
    	component.$$.dirty[key] = true;
    }

    function init(component, options, instance, create_fragment, not_equal$$1, prop_names) {
    	const parent_component = current_component;
    	set_current_component(component);

    	const props = options.props || {};

    	const $$ = component.$$ = {
    		fragment: null,
    		ctx: null,

    		// state
    		props: prop_names,
    		update: noop,
    		not_equal: not_equal$$1,
    		bound: blank_object(),

    		// lifecycle
    		on_mount: [],
    		on_destroy: [],
    		before_render: [],
    		after_render: [],
    		context: new Map(parent_component ? parent_component.$$.context : []),

    		// everything else
    		callbacks: blank_object(),
    		dirty: null
    	};

    	let ready = false;

    	$$.ctx = instance
    		? instance(component, props, (key, value) => {
    			if ($$.ctx && not_equal$$1($$.ctx[key], $$.ctx[key] = value)) {
    				if ($$.bound[key]) $$.bound[key](value);
    				if (ready) make_dirty(component, key);
    			}
    		})
    		: props;

    	$$.update();
    	ready = true;
    	run_all($$.before_render);
    	$$.fragment = create_fragment($$.ctx);

    	if (options.target) {
    		if (options.hydrate) {
    			$$.fragment.l(children(options.target));
    		} else {
    			$$.fragment.c();
    		}

    		if (options.intro && component.$$.fragment.i) component.$$.fragment.i();
    		mount_component(component, options.target, options.anchor);
    		flush();
    	}

    	set_current_component(parent_component);
    }

    class SvelteComponent {
    	$destroy() {
    		destroy(this, true);
    		this.$destroy = noop;
    	}

    	$on(type, callback) {
    		const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
    		callbacks.push(callback);

    		return () => {
    			const index = callbacks.indexOf(callback);
    			if (index !== -1) callbacks.splice(index, 1);
    		};
    	}

    	$set() {
    		// overridden by instance, if it has props
    	}
    }

    class SvelteComponentDev extends SvelteComponent {
    	constructor(options) {
    		if (!options || (!options.target && !options.$$inline)) {
    			throw new Error(`'target' is a required option`);
    		}

    		super();
    	}

    	$destroy() {
    		super.$destroy();
    		this.$destroy = () => {
    			console.warn(`Component was already destroyed`); // eslint-disable-line no-console
    		};
    	}
    }

    /* src/App.svelte generated by Svelte v3.4.0 */

    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	var main, div16, div4, h50, t1, label0, div0, span0, t3, span1, input0, t4, t5, input1, t6, label1, div1, span2, t8, span3, input2, t9, t10, input3, t11, label2, div2, span4, t13, span5, input4, t14, t15, input5, t16, label3, div3, span6, t18, span7, input6, t19, t20, input7, t21, div11, h51, t23, label4, div5, span8, t25, span9, input8, t26, input9, t27, label5, div6, span10, t29, span11, input10, t30, t31, input11, t32, label6, div7, span12, t34, span13, input12, t35, t36, input13, t37, label7, div8, span14, t39, span15, input14, t40, t41, input15, t42, label8, div9, span16, t44, span17, input16, t45, t46, input17, t47, label9, div10, span18, t49, span19, input18, t50, t51, input19, t52, div15, h52, t54, label10, div12, span20, t56, span21, input20, t57, t58, input21, t59, label11, div13, span22, t61, span23, t62, t63, t64, div14, input22, t65, select, option0, option1, dispose;

    	return {
    		c: function create() {
    			main = element("main");
    			div16 = element("div");
    			div4 = element("div");
    			h50 = element("h5");
    			h50.textContent = "Current Situation:";
    			t1 = space();
    			label0 = element("label");
    			div0 = element("div");
    			span0 = element("span");
    			span0.textContent = "📈 Monthly Income:";
    			t3 = space();
    			span1 = element("span");
    			input0 = element("input");
    			t4 = text("\n                        $");
    			t5 = space();
    			input1 = element("input");
    			t6 = space();
    			label1 = element("label");
    			div1 = element("div");
    			span2 = element("span");
    			span2.textContent = "📉 Monthly Outflow:";
    			t8 = space();
    			span3 = element("span");
    			input2 = element("input");
    			t9 = text("\n                        $");
    			t10 = space();
    			input3 = element("input");
    			t11 = space();
    			label2 = element("label");
    			div2 = element("div");
    			span4 = element("span");
    			span4.textContent = "🤓 Avg Annual Raise:";
    			t13 = space();
    			span5 = element("span");
    			input4 = element("input");
    			t14 = text("\n                        %");
    			t15 = space();
    			input5 = element("input");
    			t16 = space();
    			label3 = element("label");
    			div3 = element("div");
    			span6 = element("span");
    			span6.textContent = "💰 Savings:";
    			t18 = space();
    			span7 = element("span");
    			input6 = element("input");
    			t19 = text("\n                        $");
    			t20 = space();
    			input7 = element("input");
    			t21 = space();
    			div11 = element("div");
    			h51 = element("h5");
    			h51.textContent = "Revenue Prevision:";
    			t23 = space();
    			label4 = element("label");
    			div5 = element("div");
    			span8 = element("span");
    			span8.textContent = "📅 Month until first customer:";
    			t25 = space();
    			span9 = element("span");
    			input8 = element("input");
    			t26 = space();
    			input9 = element("input");
    			t27 = space();
    			label5 = element("label");
    			div6 = element("div");
    			span10 = element("span");
    			span10.textContent = "⬇️ Monthly Revenue per Customer:";
    			t29 = space();
    			span11 = element("span");
    			input10 = element("input");
    			t30 = text("\n                        $");
    			t31 = space();
    			input11 = element("input");
    			t32 = space();
    			label6 = element("label");
    			div7 = element("div");
    			span12 = element("span");
    			span12.textContent = "⬆️ Monthly Cost per Customer:";
    			t34 = space();
    			span13 = element("span");
    			input12 = element("input");
    			t35 = text("\n                        $");
    			t36 = space();
    			input13 = element("input");
    			t37 = space();
    			label7 = element("label");
    			div8 = element("div");
    			span14 = element("span");
    			span14.textContent = "💸 Fixed Monthly Cost:";
    			t39 = space();
    			span15 = element("span");
    			input14 = element("input");
    			t40 = text("\n                        $");
    			t41 = space();
    			input15 = element("input");
    			t42 = space();
    			label8 = element("label");
    			div9 = element("div");
    			span16 = element("span");
    			span16.textContent = "🚀 Monthly Growth:";
    			t44 = space();
    			span17 = element("span");
    			input16 = element("input");
    			t45 = text("\n                        %");
    			t46 = space();
    			input17 = element("input");
    			t47 = space();
    			label9 = element("label");
    			div10 = element("div");
    			span18 = element("span");
    			span18.textContent = "💔 Monthly Churn:";
    			t49 = space();
    			span19 = element("span");
    			input18 = element("input");
    			t50 = text("\n                        %");
    			t51 = space();
    			input19 = element("input");
    			t52 = space();
    			div15 = element("div");
    			h52 = element("h5");
    			h52.textContent = "Equity:";
    			t54 = space();
    			label10 = element("label");
    			div12 = element("div");
    			span20 = element("span");
    			span20.textContent = "😎 Ownership:";
    			t56 = space();
    			span21 = element("span");
    			input20 = element("input");
    			t57 = text("\n                        %");
    			t58 = space();
    			input21 = element("input");
    			t59 = space();
    			label11 = element("label");
    			div13 = element("div");
    			span22 = element("span");
    			span22.textContent = "🤞 Valuation:";
    			t61 = space();
    			span23 = element("span");
    			t62 = text(ctx.valuation);
    			t63 = text("$");
    			t64 = space();
    			div14 = element("div");
    			input22 = element("input");
    			t65 = text("\n                    ⨉\n                    ");
    			select = element("select");
    			option0 = element("option");
    			option0.textContent = "Monthly Recuring Revenue\n                        ";
    			option1 = element("option");
    			option1.textContent = "Monthly Margin";
    			add_location(h50, file, 29, 12, 687);
    			span0.className = "text-gray-700";
    			add_location(span0, file, 32, 20, 791);
    			input0.className = "w-auto";
    			attr(input0, "type", "number");
    			input0.min = "100";
    			input0.max = "100000";
    			add_location(input0, file, 34, 24, 896);
    			add_location(span1, file, 33, 20, 865);
    			div0.className = "flex";
    			add_location(div0, file, 31, 16, 752);
    			input1.className = "mt-1 block w-full";
    			attr(input1, "type", "range");
    			input1.min = "100";
    			input1.max = "100000";
    			add_location(input1, file, 38, 16, 1075);
    			add_location(label0, file, 30, 12, 728);
    			span2.className = "text-gray-700";
    			add_location(span2, file, 42, 20, 1263);
    			input2.className = "w-auto";
    			attr(input2, "type", "number");
    			input2.min = "100";
    			input2.max = "100000";
    			add_location(input2, file, 44, 24, 1369);
    			add_location(span3, file, 43, 20, 1338);
    			div1.className = "flex";
    			add_location(div1, file, 41, 16, 1224);
    			input3.className = "mt-1 block w-full";
    			attr(input3, "type", "range");
    			input3.min = "100";
    			input3.max = "100000";
    			add_location(input3, file, 48, 16, 1549);
    			add_location(label1, file, 40, 12, 1200);
    			span4.className = "text-gray-700";
    			add_location(span4, file, 52, 20, 1738);
    			input4.className = "w-auto";
    			attr(input4, "type", "number");
    			input4.min = "0";
    			input4.max = "100";
    			add_location(input4, file, 54, 24, 1845);
    			add_location(span5, file, 53, 20, 1814);
    			div2.className = "flex";
    			add_location(div2, file, 51, 16, 1699);
    			input5.className = "mt-1 block w-full";
    			attr(input5, "type", "range");
    			input5.min = "0";
    			input5.max = "10000000";
    			add_location(input5, file, 58, 16, 2017);
    			add_location(label2, file, 50, 12, 1675);
    			span6.className = "text-gray-700";
    			add_location(span6, file, 62, 20, 2203);
    			input6.className = "w-auto";
    			attr(input6, "type", "number");
    			input6.min = "0";
    			input6.max = "10000000";
    			add_location(input6, file, 64, 24, 2301);
    			add_location(span7, file, 63, 20, 2270);
    			div3.className = "flex";
    			add_location(div3, file, 61, 16, 2164);
    			input7.className = "mt-1 block w-full";
    			attr(input7, "type", "range");
    			input7.min = "0";
    			input7.max = "10000000";
    			add_location(input7, file, 68, 16, 2469);
    			add_location(label3, file, 60, 12, 2140);
    			div4.className = "border-2 rounded-lg border-indigo-500 px-5";
    			add_location(div4, file, 28, 8, 618);
    			add_location(h51, file, 72, 12, 2666);
    			span8.className = "text-gray-700";
    			add_location(span8, file, 75, 20, 2771);
    			input8.className = "w-auto";
    			attr(input8, "type", "number");
    			input8.min = "0";
    			input8.max = "24";
    			add_location(input8, file, 77, 24, 2888);
    			add_location(span9, file, 76, 20, 2857);
    			div5.className = "flex";
    			add_location(div5, file, 74, 16, 2732);
    			input9.className = "mt-1 block w-full";
    			attr(input9, "type", "range");
    			input9.min = "0";
    			input9.max = "24";
    			add_location(input9, file, 80, 16, 3038);
    			add_location(label4, file, 73, 12, 2708);
    			span10.className = "text-gray-700";
    			add_location(span10, file, 84, 20, 3227);
    			input10.className = "w-auto";
    			attr(input10, "type", "number");
    			input10.min = "0";
    			input10.max = "1000";
    			add_location(input10, file, 86, 24, 3346);
    			add_location(span11, file, 85, 20, 3315);
    			div6.className = "flex";
    			add_location(div6, file, 83, 16, 3188);
    			input11.className = "mt-1 block w-full";
    			attr(input11, "type", "range");
    			input11.min = "0";
    			input11.max = "1000";
    			add_location(input11, file, 90, 16, 3539);
    			add_location(label5, file, 82, 12, 3164);
    			span12.className = "text-gray-700";
    			add_location(span12, file, 94, 20, 3745);
    			input12.className = "w-auto";
    			attr(input12, "type", "number");
    			input12.min = "0";
    			input12.max = "1000";
    			add_location(input12, file, 96, 24, 3861);
    			add_location(span13, file, 95, 20, 3830);
    			div7.className = "flex";
    			add_location(div7, file, 93, 16, 3706);
    			input13.className = "mt-1 block w-full";
    			attr(input13, "type", "range");
    			input13.min = "0";
    			input13.max = "1000";
    			add_location(input13, file, 100, 16, 4067);
    			add_location(label6, file, 92, 12, 3682);
    			span14.className = "text-gray-700";
    			add_location(span14, file, 104, 20, 4286);
    			input14.className = "w-auto";
    			attr(input14, "type", "number");
    			input14.min = "0";
    			input14.max = "100000";
    			add_location(input14, file, 106, 24, 4395);
    			add_location(span15, file, 105, 20, 4364);
    			div8.className = "flex";
    			add_location(div8, file, 103, 16, 4247);
    			input15.className = "mt-1 block w-full";
    			attr(input15, "type", "range");
    			input15.min = "0";
    			input15.max = "100000";
    			add_location(input15, file, 110, 16, 4564);
    			add_location(label7, file, 102, 12, 4223);
    			span16.className = "text-gray-700";
    			add_location(span16, file, 114, 20, 4746);
    			input16.className = "w-auto";
    			attr(input16, "type", "number");
    			input16.min = "0";
    			input16.max = "100";
    			add_location(input16, file, 116, 24, 4851);
    			add_location(span17, file, 115, 20, 4820);
    			div9.className = "flex";
    			add_location(div9, file, 113, 16, 4707);
    			input17.className = "mt-1 block w-full";
    			attr(input17, "type", "range");
    			input17.min = "0";
    			input17.max = "100";
    			add_location(input17, file, 120, 16, 5017);
    			add_location(label8, file, 112, 12, 4683);
    			span18.className = "text-gray-700";
    			add_location(span18, file, 124, 20, 5196);
    			input18.className = "w-auto";
    			attr(input18, "type", "number");
    			input18.min = "0";
    			input18.max = "100";
    			add_location(input18, file, 126, 24, 5300);
    			add_location(span19, file, 125, 20, 5269);
    			div10.className = "flex";
    			add_location(div10, file, 123, 16, 5157);
    			input19.className = "mt-1 block w-full";
    			attr(input19, "type", "range");
    			input19.min = "0";
    			input19.max = "100";
    			add_location(input19, file, 130, 16, 5461);
    			add_location(label9, file, 122, 12, 5133);
    			div11.className = "border-2 rounded-lg border-green-500 px-5";
    			add_location(div11, file, 71, 8, 2598);
    			add_location(h52, file, 134, 12, 5649);
    			span20.className = "text-gray-700";
    			add_location(span20, file, 137, 20, 5757);
    			input20.className = "w-auto";
    			attr(input20, "type", "number");
    			input20.min = "0";
    			input20.max = "100";
    			add_location(input20, file, 139, 24, 5857);
    			add_location(span21, file, 138, 20, 5826);
    			div12.className = "flex";
    			add_location(div12, file, 136, 16, 5718);
    			input21.className = "mt-1 block w-full";
    			attr(input21, "type", "range");
    			input21.min = "0";
    			input21.max = "100";
    			add_location(input21, file, 143, 16, 6022);
    			label10.className = "block";
    			add_location(label10, file, 135, 12, 5680);
    			span22.className = "text-gray-700";
    			add_location(span22, file, 147, 20, 6219);
    			add_location(span23, file, 148, 20, 6289);
    			div13.className = "flex mb-5";
    			add_location(div13, file, 146, 16, 6175);
    			input22.className = "w-auto";
    			attr(input22, "type", "number");
    			input22.min = "0";
    			input22.max = "100";
    			add_location(input22, file, 151, 20, 6395);
    			option0.__value = "arpa";
    			option0.value = option0.__value;
    			add_location(option0, file, 154, 24, 6657);
    			option1.__value = "arpa - cost_per_customer";
    			option1.value = option1.__value;
    			add_location(option1, file, 157, 24, 6792);
    			if (ctx.valuation_metric === void 0) add_render_callback(() => ctx.select_change_handler.call(select));
    			select.className = "p-8";
    			add_location(select, file, 153, 20, 6550);
    			div14.className = "flex";
    			add_location(div14, file, 150, 16, 6356);
    			label11.className = "block";
    			add_location(label11, file, 145, 12, 6137);
    			div15.className = "border-2 rounded-lg border-red-500 px-5";
    			add_location(div15, file, 133, 8, 5583);
    			div16.className = "min-h-64 grid grid-rows-1 grid-flow-col gap-4";
    			add_location(div16, file, 27, 4, 550);
    			add_location(main, file, 26, 0, 539);

    			dispose = [
    				listen(input0, "input", ctx.input0_input_handler),
    				listen(input1, "change", ctx.input1_change_input_handler),
    				listen(input1, "input", ctx.input1_change_input_handler),
    				listen(input2, "input", ctx.input2_input_handler),
    				listen(input3, "change", ctx.input3_change_input_handler),
    				listen(input3, "input", ctx.input3_change_input_handler),
    				listen(input4, "input", ctx.input4_input_handler),
    				listen(input5, "change", ctx.input5_change_input_handler),
    				listen(input5, "input", ctx.input5_change_input_handler),
    				listen(input6, "input", ctx.input6_input_handler),
    				listen(input7, "change", ctx.input7_change_input_handler),
    				listen(input7, "input", ctx.input7_change_input_handler),
    				listen(input8, "input", ctx.input8_input_handler),
    				listen(input9, "change", ctx.input9_change_input_handler),
    				listen(input9, "input", ctx.input9_change_input_handler),
    				listen(input10, "input", ctx.input10_input_handler),
    				listen(input10, "change", ctx.compute_valuation),
    				listen(input11, "change", ctx.input11_change_input_handler),
    				listen(input11, "input", ctx.input11_change_input_handler),
    				listen(input11, "change", ctx.compute_valuation),
    				listen(input12, "input", ctx.input12_input_handler),
    				listen(input12, "change", ctx.compute_valuation),
    				listen(input13, "change", ctx.input13_change_input_handler),
    				listen(input13, "input", ctx.input13_change_input_handler),
    				listen(input13, "change", ctx.compute_valuation),
    				listen(input14, "input", ctx.input14_input_handler),
    				listen(input15, "change", ctx.input15_change_input_handler),
    				listen(input15, "input", ctx.input15_change_input_handler),
    				listen(input16, "input", ctx.input16_input_handler),
    				listen(input17, "change", ctx.input17_change_input_handler),
    				listen(input17, "input", ctx.input17_change_input_handler),
    				listen(input18, "input", ctx.input18_input_handler),
    				listen(input19, "change", ctx.input19_change_input_handler),
    				listen(input19, "input", ctx.input19_change_input_handler),
    				listen(input20, "input", ctx.input20_input_handler),
    				listen(input21, "change", ctx.input21_change_input_handler),
    				listen(input21, "input", ctx.input21_change_input_handler),
    				listen(input22, "input", ctx.input22_input_handler),
    				listen(input22, "change", ctx.compute_valuation),
    				listen(select, "change", ctx.select_change_handler),
    				listen(select, "change", ctx.compute_valuation)
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, main, anchor);
    			append(main, div16);
    			append(div16, div4);
    			append(div4, h50);
    			append(div4, t1);
    			append(div4, label0);
    			append(label0, div0);
    			append(div0, span0);
    			append(div0, t3);
    			append(div0, span1);
    			append(span1, input0);

    			input0.value = ctx.monthly_income;

    			append(span1, t4);
    			append(label0, t5);
    			append(label0, input1);

    			input1.value = ctx.monthly_income;

    			append(div4, t6);
    			append(div4, label1);
    			append(label1, div1);
    			append(div1, span2);
    			append(div1, t8);
    			append(div1, span3);
    			append(span3, input2);

    			input2.value = ctx.monthly_outflow;

    			append(span3, t9);
    			append(label1, t10);
    			append(label1, input3);

    			input3.value = ctx.monthly_outflow;

    			append(div4, t11);
    			append(div4, label2);
    			append(label2, div2);
    			append(div2, span4);
    			append(div2, t13);
    			append(div2, span5);
    			append(span5, input4);

    			input4.value = ctx.annual_raise;

    			append(span5, t14);
    			append(label2, t15);
    			append(label2, input5);

    			input5.value = ctx.annual_raise;

    			append(div4, t16);
    			append(div4, label3);
    			append(label3, div3);
    			append(div3, span6);
    			append(div3, t18);
    			append(div3, span7);
    			append(span7, input6);

    			input6.value = ctx.savings;

    			append(span7, t19);
    			append(label3, t20);
    			append(label3, input7);

    			input7.value = ctx.savings;

    			append(div16, t21);
    			append(div16, div11);
    			append(div11, h51);
    			append(div11, t23);
    			append(div11, label4);
    			append(label4, div5);
    			append(div5, span8);
    			append(div5, t25);
    			append(div5, span9);
    			append(span9, input8);

    			input8.value = ctx.month_to_first_dollar;

    			append(label4, t26);
    			append(label4, input9);

    			input9.value = ctx.month_to_first_dollar;

    			append(div11, t27);
    			append(div11, label5);
    			append(label5, div6);
    			append(div6, span10);
    			append(div6, t29);
    			append(div6, span11);
    			append(span11, input10);

    			input10.value = ctx.arpa;

    			append(span11, t30);
    			append(label5, t31);
    			append(label5, input11);

    			input11.value = ctx.arpa;

    			append(div11, t32);
    			append(div11, label6);
    			append(label6, div7);
    			append(div7, span12);
    			append(div7, t34);
    			append(div7, span13);
    			append(span13, input12);

    			input12.value = ctx.cost_per_customer;

    			append(span13, t35);
    			append(label6, t36);
    			append(label6, input13);

    			input13.value = ctx.cost_per_customer;

    			append(div11, t37);
    			append(div11, label7);
    			append(label7, div8);
    			append(div8, span14);
    			append(div8, t39);
    			append(div8, span15);
    			append(span15, input14);

    			input14.value = ctx.fixed_cost;

    			append(span15, t40);
    			append(label7, t41);
    			append(label7, input15);

    			input15.value = ctx.fixed_cost;

    			append(div11, t42);
    			append(div11, label8);
    			append(label8, div9);
    			append(div9, span16);
    			append(div9, t44);
    			append(div9, span17);
    			append(span17, input16);

    			input16.value = ctx.mth_growth;

    			append(span17, t45);
    			append(label8, t46);
    			append(label8, input17);

    			input17.value = ctx.mth_growth;

    			append(div11, t47);
    			append(div11, label9);
    			append(label9, div10);
    			append(div10, span18);
    			append(div10, t49);
    			append(div10, span19);
    			append(span19, input18);

    			input18.value = ctx.churn;

    			append(span19, t50);
    			append(label9, t51);
    			append(label9, input19);

    			input19.value = ctx.churn;

    			append(div16, t52);
    			append(div16, div15);
    			append(div15, h52);
    			append(div15, t54);
    			append(div15, label10);
    			append(label10, div12);
    			append(div12, span20);
    			append(div12, t56);
    			append(div12, span21);
    			append(span21, input20);

    			input20.value = ctx.ownership;

    			append(span21, t57);
    			append(label10, t58);
    			append(label10, input21);

    			input21.value = ctx.ownership;

    			append(div15, t59);
    			append(div15, label11);
    			append(label11, div13);
    			append(div13, span22);
    			append(div13, t61);
    			append(div13, span23);
    			append(span23, t62);
    			append(span23, t63);
    			append(label11, t64);
    			append(label11, div14);
    			append(div14, input22);

    			input22.value = ctx.valuation_multiple;

    			append(div14, t65);
    			append(div14, select);
    			append(select, option0);
    			append(select, option1);

    			select_option(select, ctx.valuation_metric);
    		},

    		p: function update(changed, ctx) {
    			if (changed.monthly_income) input0.value = ctx.monthly_income;
    			if (changed.monthly_income) input1.value = ctx.monthly_income;
    			if (changed.monthly_outflow) input2.value = ctx.monthly_outflow;
    			if (changed.monthly_outflow) input3.value = ctx.monthly_outflow;
    			if (changed.annual_raise) input4.value = ctx.annual_raise;
    			if (changed.annual_raise) input5.value = ctx.annual_raise;
    			if (changed.savings) input6.value = ctx.savings;
    			if (changed.savings) input7.value = ctx.savings;
    			if (changed.month_to_first_dollar) input8.value = ctx.month_to_first_dollar;
    			if (changed.month_to_first_dollar) input9.value = ctx.month_to_first_dollar;
    			if (changed.arpa) input10.value = ctx.arpa;
    			if (changed.arpa) input11.value = ctx.arpa;
    			if (changed.cost_per_customer) input12.value = ctx.cost_per_customer;
    			if (changed.cost_per_customer) input13.value = ctx.cost_per_customer;
    			if (changed.fixed_cost) input14.value = ctx.fixed_cost;
    			if (changed.fixed_cost) input15.value = ctx.fixed_cost;
    			if (changed.mth_growth) input16.value = ctx.mth_growth;
    			if (changed.mth_growth) input17.value = ctx.mth_growth;
    			if (changed.churn) input18.value = ctx.churn;
    			if (changed.churn) input19.value = ctx.churn;
    			if (changed.ownership) input20.value = ctx.ownership;
    			if (changed.ownership) input21.value = ctx.ownership;

    			if (changed.valuation) {
    				set_data(t62, ctx.valuation);
    			}

    			if (changed.valuation_multiple) input22.value = ctx.valuation_multiple;
    			if (changed.valuation_metric) select_option(select, ctx.valuation_metric);
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(main);
    			}

    			run_all(dispose);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
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
            $$invalidate('valuation', valuation = valuation_multiple * eval(valuation_metric));
        };

        compute_valuation();

    	function input0_input_handler() {
    		monthly_income = to_number(this.value);
    		$$invalidate('monthly_income', monthly_income);
    	}

    	function input1_change_input_handler() {
    		monthly_income = to_number(this.value);
    		$$invalidate('monthly_income', monthly_income);
    	}

    	function input2_input_handler() {
    		monthly_outflow = to_number(this.value);
    		$$invalidate('monthly_outflow', monthly_outflow);
    	}

    	function input3_change_input_handler() {
    		monthly_outflow = to_number(this.value);
    		$$invalidate('monthly_outflow', monthly_outflow);
    	}

    	function input4_input_handler() {
    		annual_raise = to_number(this.value);
    		$$invalidate('annual_raise', annual_raise);
    	}

    	function input5_change_input_handler() {
    		annual_raise = to_number(this.value);
    		$$invalidate('annual_raise', annual_raise);
    	}

    	function input6_input_handler() {
    		savings = to_number(this.value);
    		$$invalidate('savings', savings);
    	}

    	function input7_change_input_handler() {
    		savings = to_number(this.value);
    		$$invalidate('savings', savings);
    	}

    	function input8_input_handler() {
    		month_to_first_dollar = to_number(this.value);
    		$$invalidate('month_to_first_dollar', month_to_first_dollar);
    	}

    	function input9_change_input_handler() {
    		month_to_first_dollar = to_number(this.value);
    		$$invalidate('month_to_first_dollar', month_to_first_dollar);
    	}

    	function input10_input_handler() {
    		arpa = to_number(this.value);
    		$$invalidate('arpa', arpa);
    	}

    	function input11_change_input_handler() {
    		arpa = to_number(this.value);
    		$$invalidate('arpa', arpa);
    	}

    	function input12_input_handler() {
    		cost_per_customer = to_number(this.value);
    		$$invalidate('cost_per_customer', cost_per_customer);
    	}

    	function input13_change_input_handler() {
    		cost_per_customer = to_number(this.value);
    		$$invalidate('cost_per_customer', cost_per_customer);
    	}

    	function input14_input_handler() {
    		fixed_cost = to_number(this.value);
    		$$invalidate('fixed_cost', fixed_cost);
    	}

    	function input15_change_input_handler() {
    		fixed_cost = to_number(this.value);
    		$$invalidate('fixed_cost', fixed_cost);
    	}

    	function input16_input_handler() {
    		mth_growth = to_number(this.value);
    		$$invalidate('mth_growth', mth_growth);
    	}

    	function input17_change_input_handler() {
    		mth_growth = to_number(this.value);
    		$$invalidate('mth_growth', mth_growth);
    	}

    	function input18_input_handler() {
    		churn = to_number(this.value);
    		$$invalidate('churn', churn);
    	}

    	function input19_change_input_handler() {
    		churn = to_number(this.value);
    		$$invalidate('churn', churn);
    	}

    	function input20_input_handler() {
    		ownership = to_number(this.value);
    		$$invalidate('ownership', ownership);
    	}

    	function input21_change_input_handler() {
    		ownership = to_number(this.value);
    		$$invalidate('ownership', ownership);
    	}

    	function input22_input_handler() {
    		valuation_multiple = to_number(this.value);
    		$$invalidate('valuation_multiple', valuation_multiple);
    	}

    	function select_change_handler() {
    		valuation_metric = select_value(this);
    		$$invalidate('valuation_metric', valuation_metric);
    	}

    	return {
    		monthly_income,
    		monthly_outflow,
    		savings,
    		annual_raise,
    		month_to_first_dollar,
    		arpa,
    		cost_per_customer,
    		fixed_cost,
    		mth_growth,
    		churn,
    		ownership,
    		valuation_multiple,
    		valuation_metric,
    		valuation,
    		compute_valuation,
    		input0_input_handler,
    		input1_change_input_handler,
    		input2_input_handler,
    		input3_change_input_handler,
    		input4_input_handler,
    		input5_change_input_handler,
    		input6_input_handler,
    		input7_change_input_handler,
    		input8_input_handler,
    		input9_change_input_handler,
    		input10_input_handler,
    		input11_change_input_handler,
    		input12_input_handler,
    		input13_change_input_handler,
    		input14_input_handler,
    		input15_change_input_handler,
    		input16_input_handler,
    		input17_change_input_handler,
    		input18_input_handler,
    		input19_change_input_handler,
    		input20_input_handler,
    		input21_change_input_handler,
    		input22_input_handler,
    		select_change_handler
    	};
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, []);
    	}
    }

    const app = new App({
        target: document.querySelector("#calculator")
    });

}());
//# sourceMappingURL=main.js.map
