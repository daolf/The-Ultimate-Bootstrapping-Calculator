
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

    function svg_element(name) {
    	return document.createElementNS('http://www.w3.org/2000/svg', name);
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
    	var main, div19, div4, h50, t1, label0, div0, span0, t3, span1, input0, t4, t5, input1, t6, label1, div1, span2, t8, span3, input2, t9, t10, input3, t11, label2, div2, span4, t13, span5, input4, t14, t15, input5, t16, label3, div3, span6, t18, span7, input6, t19, t20, input7, t21, div11, h51, t23, label4, div5, span8, t25, span9, input8, t26, input9, t27, label5, div6, span10, t29, span11, input10, t30, t31, input11, t32, label6, div7, span12, t34, span13, input12, t35, t36, input13, t37, label7, div8, span14, t39, span15, input14, t40, t41, input15, t42, label8, div9, span16, t44, span17, input16, t45, t46, input17, t47, label9, div10, span18, t49, span19, input18, t50, t51, input19, t52, div18, h52, t54, label10, div12, span20, t56, span21, input20, t57, t58, input21, t59, label11, div13, span22, t61, div16, input22, t62, div15, select, option0, option1, t65, div14, svg, path, t66, div17, span23, t67, t68, t69, t70, div21, div20, h53, dispose;

    	return {
    		c: function create() {
    			main = element("main");
    			div19 = element("div");
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
    			div18 = element("div");
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
    			span22.textContent = "🤞 Calculation Method";
    			t61 = space();
    			div16 = element("div");
    			input22 = element("input");
    			t62 = text("\n                    ⨉\n                    ");
    			div15 = element("div");
    			select = element("select");
    			option0 = element("option");
    			option0.textContent = "Monthly Revenue\n                            ";
    			option1 = element("option");
    			option1.textContent = "Monthly Margin";
    			t65 = space();
    			div14 = element("div");
    			svg = svg_element("svg");
    			path = svg_element("path");
    			t66 = space();
    			div17 = element("div");
    			span23 = element("span");
    			t67 = text("= ");
    			t68 = text(ctx.valuation);
    			t69 = text("$ (for 1 customer)");
    			t70 = space();
    			div21 = element("div");
    			div20 = element("div");
    			h53 = element("h5");
    			h53.textContent = "Projection:";
    			add_location(h50, file, 24, 12, 667);
    			span0.className = "text-gray-700";
    			add_location(span0, file, 27, 20, 771);
    			input0.className = "w-auto";
    			attr(input0, "type", "number");
    			input0.min = "100";
    			input0.max = "100000";
    			add_location(input0, file, 29, 24, 876);
    			add_location(span1, file, 28, 20, 845);
    			div0.className = "flex";
    			add_location(div0, file, 26, 16, 732);
    			input1.className = "mt-1 block w-full";
    			attr(input1, "type", "range");
    			input1.min = "100";
    			input1.max = "100000";
    			add_location(input1, file, 33, 16, 1055);
    			add_location(label0, file, 25, 12, 708);
    			span2.className = "text-gray-700";
    			add_location(span2, file, 37, 20, 1243);
    			input2.className = "w-auto";
    			attr(input2, "type", "number");
    			input2.min = "100";
    			input2.max = "100000";
    			add_location(input2, file, 39, 24, 1349);
    			add_location(span3, file, 38, 20, 1318);
    			div1.className = "flex";
    			add_location(div1, file, 36, 16, 1204);
    			input3.className = "mt-1 block w-full";
    			attr(input3, "type", "range");
    			input3.min = "100";
    			input3.max = "100000";
    			add_location(input3, file, 43, 16, 1529);
    			add_location(label1, file, 35, 12, 1180);
    			span4.className = "text-gray-700";
    			add_location(span4, file, 47, 20, 1718);
    			input4.className = "w-auto";
    			attr(input4, "type", "number");
    			input4.min = "0";
    			input4.max = "100";
    			add_location(input4, file, 49, 24, 1825);
    			add_location(span5, file, 48, 20, 1794);
    			div2.className = "flex";
    			add_location(div2, file, 46, 16, 1679);
    			input5.className = "mt-1 block w-full";
    			attr(input5, "type", "range");
    			input5.min = "0";
    			input5.max = "10000000";
    			add_location(input5, file, 53, 16, 1997);
    			add_location(label2, file, 45, 12, 1655);
    			span6.className = "text-gray-700";
    			add_location(span6, file, 57, 20, 2183);
    			input6.className = "w-auto";
    			attr(input6, "type", "number");
    			input6.min = "0";
    			input6.max = "10000000";
    			add_location(input6, file, 59, 24, 2281);
    			add_location(span7, file, 58, 20, 2250);
    			div3.className = "flex";
    			add_location(div3, file, 56, 16, 2144);
    			input7.className = "mt-1 block w-full";
    			attr(input7, "type", "range");
    			input7.min = "0";
    			input7.max = "10000000";
    			add_location(input7, file, 63, 16, 2449);
    			add_location(label3, file, 55, 12, 2120);
    			div4.className = "border-2 rounded-lg border-indigo-500 px-5";
    			add_location(div4, file, 23, 8, 598);
    			add_location(h51, file, 67, 12, 2646);
    			span8.className = "text-gray-700";
    			add_location(span8, file, 70, 20, 2751);
    			input8.className = "w-auto";
    			attr(input8, "type", "number");
    			input8.min = "0";
    			input8.max = "24";
    			add_location(input8, file, 72, 24, 2868);
    			add_location(span9, file, 71, 20, 2837);
    			div5.className = "flex";
    			add_location(div5, file, 69, 16, 2712);
    			input9.className = "mt-1 block w-full";
    			attr(input9, "type", "range");
    			input9.min = "0";
    			input9.max = "24";
    			add_location(input9, file, 75, 16, 3018);
    			add_location(label4, file, 68, 12, 2688);
    			span10.className = "text-gray-700";
    			add_location(span10, file, 79, 20, 3207);
    			input10.className = "w-auto";
    			attr(input10, "type", "number");
    			input10.min = "0";
    			input10.max = "1000";
    			add_location(input10, file, 81, 24, 3326);
    			add_location(span11, file, 80, 20, 3295);
    			div6.className = "flex";
    			add_location(div6, file, 78, 16, 3168);
    			input11.className = "mt-1 block w-full";
    			attr(input11, "type", "range");
    			input11.min = "0";
    			input11.max = "1000";
    			add_location(input11, file, 85, 16, 3487);
    			add_location(label5, file, 77, 12, 3144);
    			span12.className = "text-gray-700";
    			add_location(span12, file, 89, 20, 3661);
    			input12.className = "w-auto";
    			attr(input12, "type", "number");
    			input12.min = "0";
    			input12.max = "1000";
    			add_location(input12, file, 91, 24, 3777);
    			add_location(span13, file, 90, 20, 3746);
    			div7.className = "flex";
    			add_location(div7, file, 88, 16, 3622);
    			input13.className = "mt-1 block w-full";
    			attr(input13, "type", "range");
    			input13.min = "0";
    			input13.max = "1000";
    			add_location(input13, file, 95, 16, 3951);
    			add_location(label6, file, 87, 12, 3598);
    			span14.className = "text-gray-700";
    			add_location(span14, file, 99, 20, 4138);
    			input14.className = "w-auto";
    			attr(input14, "type", "number");
    			input14.min = "0";
    			input14.max = "100000";
    			add_location(input14, file, 101, 24, 4247);
    			add_location(span15, file, 100, 20, 4216);
    			div8.className = "flex";
    			add_location(div8, file, 98, 16, 4099);
    			input15.className = "mt-1 block w-full";
    			attr(input15, "type", "range");
    			input15.min = "0";
    			input15.max = "100000";
    			add_location(input15, file, 105, 16, 4416);
    			add_location(label7, file, 97, 12, 4075);
    			span16.className = "text-gray-700";
    			add_location(span16, file, 109, 20, 4598);
    			input16.className = "w-auto";
    			attr(input16, "type", "number");
    			input16.min = "0";
    			input16.max = "100";
    			add_location(input16, file, 111, 24, 4703);
    			add_location(span17, file, 110, 20, 4672);
    			div9.className = "flex";
    			add_location(div9, file, 108, 16, 4559);
    			input17.className = "mt-1 block w-full";
    			attr(input17, "type", "range");
    			input17.min = "0";
    			input17.max = "100";
    			add_location(input17, file, 115, 16, 4869);
    			add_location(label8, file, 107, 12, 4535);
    			span18.className = "text-gray-700";
    			add_location(span18, file, 119, 20, 5048);
    			input18.className = "w-auto";
    			attr(input18, "type", "number");
    			input18.min = "0";
    			input18.max = "100";
    			add_location(input18, file, 121, 24, 5152);
    			add_location(span19, file, 120, 20, 5121);
    			div10.className = "flex";
    			add_location(div10, file, 118, 16, 5009);
    			input19.className = "mt-1 block w-full";
    			attr(input19, "type", "range");
    			input19.min = "0";
    			input19.max = "100";
    			add_location(input19, file, 125, 16, 5313);
    			add_location(label9, file, 117, 12, 4985);
    			div11.className = "border-2 rounded-lg border-green-500 px-5";
    			add_location(div11, file, 66, 8, 2578);
    			add_location(h52, file, 129, 12, 5501);
    			span20.className = "text-gray-700";
    			add_location(span20, file, 132, 20, 5609);
    			input20.className = "w-auto";
    			attr(input20, "type", "number");
    			input20.min = "0";
    			input20.max = "100";
    			add_location(input20, file, 134, 24, 5709);
    			add_location(span21, file, 133, 20, 5678);
    			div12.className = "flex";
    			add_location(div12, file, 131, 16, 5570);
    			input21.className = "mt-1 block w-full";
    			attr(input21, "type", "range");
    			input21.min = "0";
    			input21.max = "100";
    			add_location(input21, file, 138, 16, 5874);
    			label10.className = "block";
    			add_location(label10, file, 130, 12, 5532);
    			span22.className = "text-gray-700";
    			add_location(span22, file, 142, 20, 6071);
    			div13.className = "flex mb-5";
    			add_location(div13, file, 141, 16, 6027);
    			input22.className = "w-auto";
    			attr(input22, "type", "number");
    			input22.min = "0";
    			input22.max = "100";
    			add_location(input22, file, 145, 20, 6207);
    			option0.__value = "arpa";
    			option0.value = option0.__value;
    			add_location(option0, file, 149, 28, 6444);
    			option1.__value = "arpa - cost_per_customer";
    			option1.value = option1.__value;
    			add_location(option1, file, 152, 28, 6582);
    			if (ctx.valuation_metric === void 0) add_render_callback(() => ctx.select_change_handler.call(select));
    			add_location(select, file, 148, 24, 6377);
    			attr(path, "d", "M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z");
    			add_location(path, file, 157, 117, 6984);
    			attr(svg, "class", "fill-current h-4 w-4");
    			attr(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr(svg, "viewBox", "0 0 20 20");
    			add_location(svg, file, 157, 28, 6895);
    			div14.className = "pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700";
    			add_location(div14, file, 156, 24, 6769);
    			div15.className = "relative";
    			add_location(div15, file, 147, 20, 6330);
    			div16.className = "flex";
    			add_location(div16, file, 144, 16, 6168);
    			add_location(span23, file, 162, 20, 7225);
    			div17.className = "text-center mt-4";
    			add_location(div17, file, 161, 16, 7174);
    			label11.className = "block";
    			add_location(label11, file, 140, 12, 5989);
    			div18.className = "border-2 rounded-lg border-red-500 px-5";
    			add_location(div18, file, 128, 8, 5435);
    			div19.className = "min-h-64 grid grid-rows-1 grid-flow-col gap-4";
    			add_location(div19, file, 22, 4, 530);
    			add_location(h53, file, 169, 12, 7488);
    			div20.className = "border-2 rounded-lg border-yellow-500 px-5";
    			add_location(div20, file, 168, 8, 7419);
    			div21.className = "min-h-64 grid grid-rows-1 grid-flow-col gap-4 mt-5";
    			add_location(div21, file, 167, 4, 7346);
    			add_location(main, file, 21, 0, 519);

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
    				listen(input11, "change", ctx.input11_change_input_handler),
    				listen(input11, "input", ctx.input11_change_input_handler),
    				listen(input12, "input", ctx.input12_input_handler),
    				listen(input13, "change", ctx.input13_change_input_handler),
    				listen(input13, "input", ctx.input13_change_input_handler),
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
    				listen(select, "change", ctx.select_change_handler)
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, main, anchor);
    			append(main, div19);
    			append(div19, div4);
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

    			append(div19, t21);
    			append(div19, div11);
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

    			append(div19, t52);
    			append(div19, div18);
    			append(div18, h52);
    			append(div18, t54);
    			append(div18, label10);
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

    			append(div18, t59);
    			append(div18, label11);
    			append(label11, div13);
    			append(div13, span22);
    			append(label11, t61);
    			append(label11, div16);
    			append(div16, input22);

    			input22.value = ctx.valuation_multiple;

    			append(div16, t62);
    			append(div16, div15);
    			append(div15, select);
    			append(select, option0);
    			append(select, option1);

    			select_option(select, ctx.valuation_metric);

    			append(div15, t65);
    			append(div15, div14);
    			append(div14, svg);
    			append(svg, path);
    			append(label11, t66);
    			append(label11, div17);
    			append(div17, span23);
    			append(span23, t67);
    			append(span23, t68);
    			append(span23, t69);
    			append(main, t70);
    			append(main, div21);
    			append(div21, div20);
    			append(div20, h53);
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
    			if (changed.valuation_multiple) input22.value = ctx.valuation_multiple;
    			if (changed.valuation_metric) select_option(select, ctx.valuation_metric);

    			if (changed.valuation) {
    				set_data(t68, ctx.valuation);
    			}
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
    	let valuation_multiple = 40;
    	let valuation_metric = "arpa";

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

    	let valuation;

    	$$self.$$.update = ($$dirty = { ownership: 1, valuation_multiple: 1, valuation_metric: 1, arpa: 1, cost_per_customer: 1 }) => {
    		if ($$dirty.ownership || $$dirty.valuation_multiple || $$dirty.valuation_metric || $$dirty.arpa || $$dirty.cost_per_customer) { $$invalidate('valuation', valuation = Math.floor(ownership / 100 * valuation_multiple * ((valuation_metric=="arpa") ? arpa : arpa - cost_per_customer))); }
    	};

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
