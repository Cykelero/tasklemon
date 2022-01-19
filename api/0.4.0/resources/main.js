// Constants
var animationDuration;

// Variables
var members = [];

// Classes, functions
function Member(node) {
	this.node = node;
	this.titleNode = node.querySelector("h4");
	this.contentNode = node.querySelector(".class-member-content");
	
	this.id = this.node.id;
	
	// Init
	// // Events
	this.titleNode.addEventListener("click", this.onTitleClick.bind(this));
	this.titleNode.addEventListener("mousedown", this.startTitleClickTracking.bind(this));
	
	// // Start closed
	this.contentNode.style.display = "none";
	this.node.classList.add("folded");
};

Member.prototype = {
	folded: true,
	preventNextToggle: false,
	foldEndTimeout: null,
	
	titleClickStartPosition: null,
	boundEndTrackingFunction: null,
	
	
	toggleFolded: function(scrollToReveal, thenUpdateHash) {
		this.setFolded(!this.folded, scrollToReveal, thenUpdateHash);
	},
	
	setFolded: function(fold, scrollToReveal, thenUpdateHash) {
		var self = this;
		
		requestAnimationFrame(function() {
			if (this.foldEndTimeout) {
				this.foldEndTimeout.triggerNow();
			}
			
			// Set folded
			if (fold != this.folded) {
				this.folded = fold;
				
				var startHeight,
					endHeight,
					offset,
					startBottomPadding,
					endBottomPadding,
					
					currentScrollPosition,
					distanceToBottom,
					willScrollBy,
					
					precedingNodes,
					followingNodes;
				
				// Measure current dimensions
				startHeight = this.node.offsetHeight;
				startBottomPadding = parseInt(getComputedStyle(this.node).paddingBottom);
				currentScrollPosition = scrollY;
				distanceToBottom = document.body.scrollHeight - window.innerHeight - currentScrollPosition;
				
				// Fold/unfold, measure new dimensions
				this.contentNode.style.display = fold ? "none" : "";
				this.contentNode.style.opacity = fold ? "1" : "0";
				this.node.classList.toggle("folded", fold);
				
				endHeight = this.node.offsetHeight;
				endBottomPadding = parseInt(getComputedStyle(this.node).paddingBottom);
				offset = startHeight - endHeight;
				
				this.contentNode.style.display = "";
				
				// Handle scroll
				willScrollBy = 0;
				
				// // Scroll to reveal
				if (!fold && scrollToReveal) {
					var nodeDimensions = this.node.getBoundingClientRect(),
						nodeTop = nodeDimensions.top + window.scrollY,
						nodeBottom = nodeTop + endHeight,
						minScroll = nodeBottom - window.innerHeight,
						maxScroll = nodeTop - 5;
					
					minScroll = Math.min(minScroll, maxScroll); // maxScroll has the priority
					
					if (window.scrollY > maxScroll) {
						willScrollBy = maxScroll - currentScrollPosition;
					} else if (window.scrollY < minScroll) {
						willScrollBy = minScroll - currentScrollPosition;
					}
				}
				
				// // Limit scroll to page edge
				willScrollBy = Math.max(-currentScrollPosition, willScrollBy);
				willScrollBy = Math.min(distanceToBottom - offset, willScrollBy);
							
				// // Apply scroll immediately
				if (willScrollBy) {
					scrollTo(0, currentScrollPosition + willScrollBy);
				}
				
				// Create white mask
				var maskTopMargin = fold ? -(Math.abs(offset)) : -startBottomPadding,
					maskBottomMargin = fold ? (startBottomPadding - endBottomPadding) - (Math.abs(offset)) : (startBottomPadding) - (Math.abs(offset));
				
				var maskNode = document.createElement("div");
				maskNode.style.display = "block";
				maskNode.style.background = "var(--background-color)";
				maskNode.style.width = "100%";
				maskNode.style.height = Math.abs(offset) + "px";
				maskNode.style.marginTop = maskTopMargin + "px";
				maskNode.style.marginBottom = maskBottomMargin + "px";
				
				this.node.parentNode.insertBefore(maskNode, this.node.nextSibling);
				
				// Move subsequent nodes back to their original position
				precedingNodes = this.getNodesInDirection(false, true);
				precedingNodes.push(this.node);
				
				followingNodes = this.getNodesInDirection(true, true);
				
				if (willScrollBy) {
					precedingNodes.forEach(function(nodeToPush) {
						nodeToPush.style.transitionProperty = "none";
						nodeToPush.style.transform = 
						nodeToPush.style.webkitTransform = "translate(0, " + willScrollBy + "px)";
					});
				}
				
				followingNodes.forEach(function(nodeToPush) {
					nodeToPush.style.transitionProperty = "none";
					nodeToPush.style.transform = 
					nodeToPush.style.webkitTransform = "translate(0, " + (offset + willScrollBy) + "px)";
				});
				
				setTimeout(function() {
					// Animate subsequent nodes to their natural position
					if (willScrollBy) {
						precedingNodes.forEach(function(nodeToPush) {
							nodeToPush.style.transitionProperty = "transform";
							nodeToPush.style.webkitTransitionProperty = "-webkit-transform";
							nodeToPush.style.transform = 
							nodeToPush.style.webkitTransform = "";
						});
					}
					
					if (offset + willScrollBy) {
						followingNodes.forEach(function(nodeToPush) {
							nodeToPush.style.transitionProperty = "transform";
							nodeToPush.style.webkitTransitionProperty = "-webkit-transform";
							nodeToPush.style.transform = 
							nodeToPush.style.webkitTransform = "";
						});
					}
					
					// Animate content opacity
					self.contentNode.style.transitionProperty = "opacity";
					self.contentNode.style.opacity = fold ? "0" : "1";
					
					// When animation is finished, clean up
					this.foldEndTimeout = new Timeout(function() {
						if (fold) {
							self.contentNode.style.display = "none";
						} else {
							self.contentNode.style.display = "";
						}
						
						maskNode.parentNode.removeChild(maskNode);
					}, animationDuration);
				}, 0);
			}
		}.bind(this));
		
		if (thenUpdateHash) {
			setTimeout(function() {
				updateHash();
			}, 100);
		}
	},
	
	onTitleClick: function(event) {
		if (this.preventNextToggle) {
			this.preventNextToggle = false;
			return;
		}
		
		if (window.getSelection) {
			window.getSelection().removeAllRanges();
		} else {
			document.selection.empty();
		}
		
		this.toggleFolded(true, true);
	},
	
	startTitleClickTracking: function(event) {
		this.titleClickStartPosition = {
			x: event.pageX,
			y: event.scrollY
		};
		
		this.boundEndTrackingFunction = this.endTitleClickTracking.bind(this);
		window.addEventListener("mouseup", this.boundEndTrackingFunction);
	},
	
	endTitleClickTracking: function(event) {
		var self = this;
		
		var titleClickEndPosition = {
			x: event.pageX,
			y: event.scrollY
		};
		
		var xDistance = Math.abs(this.titleClickStartPosition.x - titleClickEndPosition.x);
		
		if (xDistance > 3) {
			this.preventNextToggle = true;
			setTimeout(function() {
				self.preventNextToggle = false;
			}, 1);
		}
		
		window.removeEventListener("mouseup", this.boundEndTrackingFunction);
		delete this.titleClickStartPosition;
		delete this.boundEndTrackingFunction;
		
	},
	
	getNodesInDirection: function(following, excludeTextNodes) {
		var result = [];
		var adjacentProperty = following ? "nextSibling" : "previousSibling";
		
		var currentNode = this.node;
		while (true) {
			// Find next/previous node
			var adjacentNode = currentNode[following ? "nextSibling" : "previousSibling"];
			if (adjacentNode) {
				currentNode = adjacentNode;
			} else {
				currentNode = currentNode.parentNode;
				if (currentNode == document.body) break;
				continue;
			}
			if (currentNode.nodeType == 1) result.push(currentNode);
		};
		
		return result;
	}
};

Timeout = function(callback, delay) {
	this.callback = callback;
	this.hasTriggered = false;
	
	// Init
	setTimeout(this.triggerNow.bind(this), delay);
};

Timeout.prototype = {
	triggerNow: function() {
		if (!this.hasTriggered) {
			this.hasTriggered = true;
			this.callback();
		}
	},
	
	cancel: function() {
		this.hasTriggered = true;
	}
};

function getMemberById(id) {
	for (var m = 0; m < members.length; m++) {
		var member = members[m];
		if (member.id == id) {
			return member;
		}
	};
	
	return null;
};

function updateHash() {
	var currentURLWithoutHash = location.href.match(/([^#]+)(#|$)/)[1],
		currentHash = location.hash.slice(1),
		firstOpenMemberNode = document.querySelector(".class-member:not(.folded)");
	
	if (firstOpenMemberNode) {
		var newHash = firstOpenMemberNode.id;
		if (currentHash != newHash) {
			history.pushState(null, null, currentURLWithoutHash + "#" + newHash);
		}
	} else {
		if (/#/.test(location.href)) {
			history.pushState(null, null, currentURLWithoutHash);
		}
	}
};

// Initialization
document.addEventListener("DOMContentLoaded", function() {
	// Retrieve default animation duration
	animationDuration = parseFloat(getComputedStyle(document.body).transitionDuration) * 1000;
	
	// Create Member objects
	var memberNodes = document.getElementsByClassName("class-member");
	for (var m = 0; m < memberNodes.length; m++) {
		var member = new Member(memberNodes[m]);
		members.push(member);
	}
	
	// Install link click handler
	var documentName = location.href.match(/([^\/#]*)(#|$)/)[1];
	var aNodes = document.getElementsByTagName("a");
	for (var a = 0; a < aNodes.length; a++) {
		var aNode = aNodes[a],
			targetComponents = (aNode.getAttribute("href") || "").match(/([^#]*)(#.*)?$/),
			targetDocument = targetComponents[1];
		
		if (documentName == targetDocument || targetDocument == "") {
			var targetId = (targetComponents[2] || "").slice(1);
			if (targetId.length) {
				aNode.addEventListener("click", function(targetId, event) {
					event.preventDefault();
					
					var member = getMemberById(targetId);
					if (member) member.setFolded(false, true, true);
				}.bind(null, targetId));
			}
		}
	}
	
	// If a hash is specified, reveal the corresponding member
	var hash = location.hash.slice(1);
	setTimeout(function() {
		var focusedMember = getMemberById(hash);
		if (focusedMember) focusedMember.setFolded(false, true, false);
	}, 100);
});

window.addEventListener("hashchange", function() {
	var hash = location.hash.slice(1),
		focusedMember = getMemberById(hash);
	
	if (focusedMember) focusedMember.setFolded(false, true, false);
});
