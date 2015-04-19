/**
 * A plugin to identify (and validate) header tags.
 */

var $ = require("jquery");
var Plugin = require("../base");
var annotate = require("../shared/annotate");
// TODO: if we want multiple plugins simultaneously we'll need to namespace
// annotations to remove them individually

var infoTemplate = require("./info.handlebars");

require("./style.less");

class Header extends Plugin {
    getTitle() {
        return "Headers";
    }

    getDescription() {
        return "Highlights headers (<h1>, <h2>, etc) and order violations";
    }

    hierarchy($headers) {
        // `root` is a pseudotree that we will eventually use to construct the
        // info panel
        var root = { level: 0, children: [] };
        var prevLevel = 0;

        // Function to add an item to the `root` tree.
        // This checks the item for any header violations, and builds an
        // element that we can eventually place in the info panel.
        var add = ($el, children, parentLevel) => {
            var last = children.length && children[children.length-1];
            var level = +$el.prop("tagName").slice(1);
            var text = $el.text();

            if (!children.length || level <= last.level) {
                var errorData;

                // Check for violations
                if (parentLevel === 0 && level !== 1) {
                    // First header should be an h1
                    errorData = "Your first header should be an <h1>";
                } else if (level === 1 && children.length) {
                    // There should only be one h1
                    errorData = "You should not use more than one <h1>";
                } else if (level - parentLevel > 1) {
                    // Should only go up by one
                    errorData = "You should not have any gaps in your " +
                                "header numbering";
                }

                var $info = $("<span>")
                    .addClass("header-level")
                    .toggleClass("header-level-error", errorData !== undefined)
                    .text(level);

                if (errorData) {
                    $info
                        .addClass("tota11y-tooltipped")
                        .attr("data-content", errorData);
                }

                var $content = $("<div>")
                    .append($info)
                    .append($("<span>").addClass("header-text").text(text))
                    .html();

                // Create a new node
                children.push({
                    level: level,
                    children: [],
                    content: $content,
                    $el: $el
                });
            } else {
                add($el, last.children, last.level);
            }
        };

        $headers.each(function() {
            add($(this), root.children, 0);
        });

        // This builds the info box and attaches some event listeners to its
        // items
        var $highlight;
        var treeToHtml = (tree) => {
            var $root = (tree.level === 0) ?
                $("<div>") :
                $("<ul>").append($("<li>").html(tree.content));

            $root.append(tree.children.map(treeToHtml));

            // Tag the parent element and set events
            if (tree.$el) {
                annotate.label(tree.$el);

                $root.find("> li").on("mouseenter", (e) => {
                    e.stopPropagation();
                    $highlight && $highlight.remove();
                    $highlight = annotate.highlightText(
                        tree.$el, "tota11y-header-highlight");
                }).on("mouseleave", (e) => {
                    e.stopPropagation();
                    $highlight.remove();
                });
            }

            return $root;
        };

        // Finally, convert `tree` to HTML
        return treeToHtml(root);
    }

    /**
     * Tags headers
     *
     * Returns HTML mapping out the header hierarchy.
     */
    run() {
        var _tag = this.tag;
        var $headers = $("h1, h2, h3, h4, h5, h6");

        var $template = $(infoTemplate());
        var $hierarchy = this.hierarchy($headers);

        $template.find(".hierarchy").append($hierarchy);

        return $template;
    }

    cleanup() {
        $(".tota11y-tag").remove();
    }
}

module.exports = Header;
